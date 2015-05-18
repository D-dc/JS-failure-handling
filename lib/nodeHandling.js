'use strict';


require('./reflect.js');
var debug = require('debug')('handler'),
	adapter = require('./RpcLibAdapter.js');

require('./logSingleton.js');
require('./bufferSingleton.js');


//works on node v0.12.1
//use: node --harmony-proxies


/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, TooManyArgumentsError, NoConnectionError, SerializationError, DeserializionError, LibraryError, NetworkError*/


var Handler = (function () {

	var module = {};

	var noOp = function () {};

	/* Priority handling */
	var HandlerManager = function () {
		this.handledExceptions = {};
	};

	HandlerManager.prototype.setHandled = function (handleMethod, byHandler) {
		this.handledExceptions[handleMethod] = byHandler;
	};

	HandlerManager.prototype.mayHandle = function (handleMethod, byHandler) {
		if (!byHandler) {
			return !(this.handledExceptions[handleMethod]);
		}

		return !this.handledExceptions[handleMethod] || this.handledExceptions[handleMethod] === byHandler;
	};

	/* RPC call representation */
	var makeRPCObject = function (functionName, args, continuation, due) {
		return {
			functionName: functionName,
			args: args,
			arity: args.length,
			continuation: continuation,
			due: due
		}
	};

	var makeContinuationObject = function (error, result, retry) {
		return {
			error: error,
			result: result,
			retry: retry
		}
	};


	/* The failure handler */
	var FailureHandler = function (stubAdapter, handlerLeafConstructor, proxyTarget) {
		this.stubAdapter = stubAdapter;
		this.proxyTarget = proxyTarget;
		this.handlerLeafConstructor = handlerLeafConstructor;
		this._onResolved = [];
	};

	FailureHandler.prototype.install = function (proxy, proxyCallArgs, proxyMethodName, failureLeaf) {
		var self = this,
			adapter = this.stubAdapter,
			savedArgs = proxyCallArgs.slice();

		//intercept callback arguments and use handler if 'error' argument is set.
		var interceptedArgs = adapter.setRpcContinuation(proxyCallArgs, function () {
			debug('--> Proxy failure handler.', adapter.getRpcFunctionName(proxyCallArgs), adapter.getRpcArgs(proxyCallArgs));

			var continuation = adapter.asContinuation(arguments),
				call = adapter.asRpc(proxyCallArgs),
				newArgs = savedArgs.slice(),
				originalCb = adapter.getRpcContinuation(newArgs);

			if (!continuation.error) {
				debug('NORMAL Result');
				//We have a result, no error.
				self._resolve(continuation.result);
				//just execute original callback.
				return originalCb(continuation.error, continuation.result);

			} else {
				//either we get an existing failureLeaf (e.g. retry performed), 
				//need to reuse that existing handler to keep its state.
				var argsForContext = savedArgs;

				if (!failureLeaf) {
					debug('NEW Handler');

					//start with a new handler
					failureLeaf = new self.handlerLeafConstructor();

					//Make sure the original CB gets only invoked once per handler!
					newArgs = adapter.setRpcContinuation(newArgs, function (invoked, originalCallback) {
						return function () {
							var continuation = adapter.asContinuation(arguments);

							if (!invoked) {
								invoked = true;
								originalCallback(continuation.error, continuation.result);
							} else {
								debug('-> call suppressed');
							}
						};
					}(false, originalCb));

					argsForContext = newArgs;
				} else {
					debug('REUSE Handler', failureLeaf);
				}

				//We make a new Context object every time we start a handling sequence (tree walk).
				failureLeaf.ctxt = self.makeContextObject(proxy, argsForContext, call, proxyMethodName, continuation, failureLeaf);

				return failureLeaf.handleException();
			}

		});

		return interceptedArgs;
	};

	FailureHandler.prototype.makeContextObject = function (proxy, savedArgs, call, proxyMethodName, continuation, failureLeaf) {
		var handlerMaker = this,
			adapter = this.stubAdapter;

		return {
			_handledExceptions: new HandlerManager(),

			// info about the stub call: target.methodName(methodArgs)
			stub: proxy, //target !!!! back to proxy
			stubCall: {
				methodArgs: function () {
					return savedArgs.slice();
				},
				methodName: proxyMethodName
			},

			// info about the RPC (callName, callArgs, function(callError, callResult, callRetry){})
			callName: call.functionName,
			callArgs: function () {
				return call.args.slice();
			},
			isCallErrorType: function (exceptionType) {
				var currentException = this.callError;
				return currentException && (currentException instanceof exceptionType);
			},
			callError: continuation.error,
			callResult: continuation.result,
			callRetry: continuation.retry,


			//RETRY: We retry the ORIGINAL call, same args. (Takes into account omission failures, callee side-effects)
			retry: function (continuation) {
				var self = this;

				this._doOnHandlingFinished(function () {
					debug('-> Retrying', this);

					var retry = self.callRetry;
					if (retry) {
						return retry(continuation);
					}
				});
			},

			//Perform a different call
			alternateCall: function (newCallName, newCallArgs, continuation) {
				var self = this;
				this._doOnHandlingFinished(function () {
					debug('-> AlternateCall', this);
					var stubCall = self.stubCall;

					newCallName = newCallName || adapter.getRpcFunctionName(stubCall.methodArgs());
					newCallArgs = newCallArgs || adapter.getRpcArgs(stubCall.methodArgs());
					continuation = continuation || adapter.getRpcContinuation(stubCall.methodArgs());

					var newMethodArgs = adapter.buildNewRpcArgs(newCallName, newCallArgs, continuation);
					var newArgs = handlerMaker.install(proxy, newMethodArgs, proxyMethodName, failureLeaf);
					//Directly on the proxyTarget, we already intercepted the args to use 'currentHandler' again.
					var proxyTarget = handlerMaker.proxyTarget;
					proxyTarget[stubCall.methodName].apply(proxyTarget, newArgs);
				});
			},

			//Invoke the callback (e.g. for giving default return values)
			continue: function (err, res, retry) {
				var self = this;
				this._doOnHandlingFinished(function () {
					debug('-> continue', this);

					var originalCb = self._getOriginalCb();
					var newArgs = adapter.buildNewContinuationArgs(err, res, retry);

					originalCb.apply(self.stub, newArgs);
				});
			},

			proceed: function () {
				debug('-> proceding propagation');
				this._proceedHandling = true;
			},

			//Continue the continuation as failed
			fail: function (err) {
				debug('-> fail');
				this.continue(err);

			},

			//Continue the continuation as succeeded
			succeed: function (res) {
				debug('-> succeed');
				this.continue(undefined, res);

			},

			hasFailureContinuation: function () {
				debug('-> hasFailureContinuation');
				this._doOnHandlingFinished(noOp);
			},

			_proceedHandling: true,
			_isFinished: false,
			_onFinished: [],
			_doOnResolved: function (continuation) {
				handlerMaker._doOnResolved(continuation);
			},
			_doOnHandlingFinished: function (continuation) {
				//no need to postpone continuation if our handling has finished already
				if (this._isFinished) continuation();

				this._onFinished.push(continuation);
			},
			_handlingFinished: function () {
				this._isFinished = true;
				debug('-- Single handler tree walk finished', this._onFinished.length);

				//If we have nothing more to do, 
				//invoke the original callback to perform synchronous handling
				if (this._proceedHandling && this._onFinished.length === 0) {

					var originalCb = this._getOriginalCb();
					var newArgs = adapter.buildNewContinuationArgs(this.callError, this.callResult, this.callRetry);
					originalCb.apply(this.stub, newArgs);

					handlerMaker._resolve(this.callError);
					return;
				}


				for (var i in this._onFinished) {
					this._onFinished[i]();
				}
				//this._onFinished[]; not needed as ctxt is only used once.
			},
			_getOriginalCb: function () {
				return adapter.getRpcContinuation(this.stubCall.methodArgs());
			},
		};
	};

	//We are able to install continuations to execute when the handling stopped.
	// this means that either we went through all the handlers (and none performed retries or alternative calls)
	// or some handlers did and we got a result (and no exception).
	FailureHandler.prototype._doOnResolved = function (continuation) {
		this._onResolved.push(continuation);
	};

	FailureHandler.prototype._resolve = function (outcome) {
		debug('-- Entire Handling finished', outcome);

		for (var i in this._onResolved) {
			this._onResolved[i](outcome);
		}
		this._onResolved = [];
	};

	module.makeRPCObject = makeRPCObject;
	module.makeContinuationObject = makeContinuationObject;
	module.FailureHandler = FailureHandler;
	module.noOp = noOp;

	return module;
})();

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

/* Make a proxy for the target stub, taking an adaptor and the constructor of the first handler.*/
var makeFailureProxy = function (target, stubAdapter) {
	stubAdapter = stubAdapter || adapter;
	if (!stubAdapter || typeof stubAdapter !== 'function')
		throw new Error('Expected RPC lib adapter.');

	stubAdapter =
		stubAdapter(Handler.makeRPCObject, Handler.makeContinuationObject);

	return function (HandlerConstructor) {

		var proxyHandler = {
			get: function (proxyTarget, proxyMethodName) {
				//Only intercept certain function invocations.
				if (typeof proxyTarget[proxyMethodName] === 'function' &&
					proxyMethodName === stubAdapter.stubMethodName) {

					return function () {
						var handler, interceptedArgs,
							proxyCallArgs = Array.prototype.slice.call(arguments);

						//make sure we have a continuation.
						if (!stubAdapter.getRpcContinuation(proxyCallArgs)) {
							proxyCallArgs.push(Handler.noOp);
						}

						handler = new Handler.FailureHandler(stubAdapter, HandlerConstructor, proxyTarget);
						interceptedArgs = handler.install(this, proxyCallArgs, proxyMethodName);

						//invoke original target.
						return proxyTarget[proxyMethodName].apply(this, interceptedArgs);

					};

				}

				//otherwise, just redirect call
				return proxyTarget[proxyMethodName];

			}
		};

		return new Proxy(target, proxyHandler);
	};
};

/* 
	Prototype node for the handlers
	contains the handling logic and precedence
*/
var HandlerNode = function () {
	this.nativeErrors = [
		EvalError,
		RangeError,
		ReferenceError,
		SyntaxError,
		TypeError,
		URIError
	];

	this.libraryErrors = [
		FunctionNotFoundError,
		TooManyArgumentsError,
		SerializationError,
		DeserializionError,
		LibraryError
	];

	this.networkErrors = [
		TimeOutError,
		NoConnectionError,
		NetworkError
	];
};


HandlerNode.prototype.handleException = function (target) {

	var ctxt = this;
	var self = this;
	var err = this.ctxt.callError;
	target = target || this;

	var lookupMethod = function (handlerMethod) {

		var calledSuper = false;

		//SPECIFIC EXCEPTIONS: check if or current node has the handlerMethod
		if (target[handlerMethod] && self.ctxt._handledExceptions.mayHandle(handlerMethod, target)) {
			console.log(target.prototype.toString(), handlerMethod, 'Priority: ', target.flagPriority);

			//if the priority flag is set, we indicate this so the exception is considered handled.
			if (target.flagPriority) {
				self.ctxt._handledExceptions.setHandled(handlerMethod, target);
			}

			self.ctxt._proceedHandling = false;

			//apply the method
			target[handlerMethod].apply(ctxt);

			if (target.super && self.ctxt._proceedHandling) {

				target.super(ctxt);
				calledSuper = true;
			}


		} else {
			//ALL EXCEPTIONS
			if (!target.onException) {
				//OnException method is not defined, continue in super.

				if (!target.super) {

					console.log(target.toString(), 'no handling method found (leaf).', 'Priority: ', target.flagPriority);
					//need explicit constructor super method call for leaves
					if (target.constructor.super) {
						target.constructor.super.apply(ctxt, [ctxt]);
						calledSuper = true;
					}

				} else {

					console.log(target.prototype.toString(), 'no handling method found (skip).', 'Priority: ', target.flagPriority);

					target.super.apply(ctxt, [ctxt]);
					calledSuper = true;

				}

			} else {

				console.log(target.prototype.toString(), 'onException', 'Priority: ', target.flagPriority);


				self.ctxt._proceedHandling = false;
				target.onException.apply(ctxt);

				if (target.super && self.ctxt._proceedHandling) {

					target.super(ctxt);
					calledSuper = true;
				}

			}
		}

		if (!calledSuper) {
			console.log('FINISHED')
				//We went through the entire handling tree.
			self.ctxt._handlingFinished();
		}
	};


	var checkOfErrorType = function (err, errType) {
		return errType.some(function (error) {
			return (err instanceof error);
		});
	};

	if (err && checkOfErrorType(err, this.nativeErrors)) {

		lookupMethod('onNativeException');

	} else if (err && checkOfErrorType(err, this.libraryErrors)) {

		lookupMethod('onLibraryException');

	} else if (err && checkOfErrorType(err, this.networkErrors)) {

		lookupMethod('onNetworkException');

	} else {

		lookupMethod('onApplicationException');

	}
};


global.makeFailureProxy = makeFailureProxy;
global.HandlerNode = HandlerNode;