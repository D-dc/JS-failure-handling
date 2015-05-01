'use strict';

if (typeof exports !== 'undefined') {
	require('./reflect.js');
}



//works on node v0.12.1
//use: node --harmony-proxies


/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


var NodeHandling = (function () {
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

	var FailureHandler = function (stubAdapter, handlerLeafConstructor, proxyTarget) {
		this.stubAdapter            = stubAdapter;
		this.proxyTarget            = proxyTarget;
		this.handlerLeafConstructor = handlerLeafConstructor;
		this._onResolved            = [];
	};

	FailureHandler.prototype.install = function (proxy, proxyMethodArgs, proxyMethodName, failureLeaf) {
		var self = this,
			stubAdapter = this.stubAdapter,
			oldCb       = stubAdapter.getRpcContinuation(proxyMethodArgs),
			savedArgs   = proxyMethodArgs.slice();

		//intercept callback arguments and use handler if 'error' argument is set.
		stubAdapter.setRpcContinuation(proxyMethodArgs, function () {
			console.log('--> Proxy failure handler.', stubAdapter.getRpcFunctionName(proxyMethodArgs), stubAdapter.getRpcArgs(proxyMethodArgs));

			var rpcError = stubAdapter.getContinuationError(arguments),
				rpcResult  = stubAdapter.getContinuationResult(arguments),
				rpcRetry   = stubAdapter.getContinuationRetry(arguments),
				newArgs    = savedArgs.slice(),
				originalCb = stubAdapter.getRpcContinuation(newArgs);

			if (!rpcError) {
				//We have a result, no error.
				self._resolve(rpcResult);
				return originalCb(rpcError, rpcResult); //just execute original callback.
			}

			//either we get an existing failureLeaf (e.g. retry performed), 
			//need to reuse that existing handler to keep its state.
			var argsForContext = savedArgs;

			if (!failureLeaf) {
				console.log('NEW Handler');

				//start with a new handler
				failureLeaf = new self.handlerLeafConstructor();
				//var newArgs = savedArgs.slice();

				//Make sure the original CB gets only invoked once per handler!
				stubAdapter.setRpcContinuation(newArgs, function (invoked, oldCb) {
					return function () {
						var err = stubAdapter.getContinuationError(arguments),
							res = stubAdapter.getContinuationResult(arguments);

						if (!invoked) {
							invoked = true;
							oldCb(err, res);
						} else {
							console.log('-> call suppressed');
						}
					};
				}(false, stubAdapter.getRpcContinuation(newArgs)));

				argsForContext = newArgs;
			} else {
				console.log('REUSE Handler');
			}

			//We make a new Context object every time we start a handling sequence (tree walk).
			failureLeaf.ctxt = self.makeContextObject(proxy, argsForContext, proxyMethodArgs, proxyMethodName, rpcError, rpcResult, rpcRetry, failureLeaf);

			console.log(failureLeaf.ctxt.toString());
			return failureLeaf.handleException();

		});

		return proxyMethodArgs;
	};

	FailureHandler.prototype.makeContextObject = function (proxy, savedArgs, proxyMethodArgs, proxyMethodName, rpcError, rpcResult, rpcRetry, failureLeaf) {
		var handlerMaker = this,
			stubAdapter = this.stubAdapter,
			rpcFunctionName = stubAdapter.getRpcFunctionName(proxyMethodArgs),
			rpcArgs = stubAdapter.getRpcArgs(proxyMethodArgs);

		return {
			toString: function () {
				return 'RPCCALL: ' + this.callName + ' ' + this.callArgs() + ' ' + this.callError + ' ' + this.callResult + ' \n STUB: ' + this.stubCall.methodName;
			},
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
			callName: rpcFunctionName,
			callArgs: function () {
				return rpcArgs.slice();
			},
			isCallErrorType: function(exceptionType) {
				var currentException = this.callError;
				return currentException && (currentException instanceof exceptionType);
			},
			callError:      rpcError,
			callResult:     rpcResult,
			callRetry:      rpcRetry,


			//RETRY: We retry the ORIGINAL call, same args. (Takes into account omission failures, callee side-effects)
			retry: function (continuation) {
				var self = this;

				this._doOnHandlingFinished(function () {
					console.log('performing retry now', this);
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
					var stubCall = self.stubCall;
					if (!continuation)
						continuation = stubAdapter.getRpcContinuation(stubCall.methodArgs());

					console.log('continuation,', continuation);

					var newMethodArgs = stubAdapter.buildNewRpcArgs(newCallName, newCallArgs, continuation);
					var newArgs       = handlerMaker.install(proxy, newMethodArgs, proxyMethodName, failureLeaf);
					//Directly on the proxyTarget, we already intercepted the args to use 'currentHandler' again.
					var proxyTarget = handlerMaker.proxyTarget;
					proxyTarget[stubCall.methodName].apply(proxyTarget, newArgs);
				});
			},

			//Invoke the callback (e.g. for giving default return values)
			continue: function (err, res, retry) {
				var self = this;
				this._doOnHandlingFinished(function () {
					var originalCb = self._getOriginalCb();
					var newArgs = stubAdapter.buildNewCbArgs(err, res, retry);

					originalCb.apply(self.stub, newArgs);
				});
			},

			//Continue the continuation as failed
			fail: function (err) {

				this.continue(err);

			},

			//Continue the continuation as succeeded
			succeed: function (res) {

				this.continue(null, res);

			},
			_isFinished:   false,
			_onFinished:   [],
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
				console.log('-- Single handler tree walk finished');
				if (this._onFinished.length === 0)
					return handlerMaker._resolve(this.callError);

				for (var i in this._onFinished) {
					this._onFinished[i]();
				}
				//this._onFinished[]; not needed as ctxt is only used once.
			},
			_getOriginalCb: function () {
				return stubAdapter.getRpcContinuation(this.stubCall.methodArgs());
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
		console.log('-- Entire Handling finished', outcome);
		for (var i in this._onResolved) {
			this._onResolved[i](outcome);
		}
		this._onResolved = [];
	};

	module.FailureHandler = FailureHandler;
	module.noOp = noOp;

	return module;
})();

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

/* Make a proxy for the target stub, taking an adaptor and the constructor of the first handler.*/
var makeFailureProxy = function (target, stubAdapter) {

	return function (HandlerConstructor) {

		var proxyHandler = Object.create({});
		proxyHandler.get = function (proxyTarget, proxyMethodName) {
			//Only intercept function invocations with certain name.
			if (typeof proxyTarget[proxyMethodName] === 'function' && proxyMethodName === stubAdapter.stubMethodName) {
				return function () {
					var proxyMethodArgs = Array.prototype.slice.call(arguments);

					if (!stubAdapter.getRpcContinuation(proxyMethodArgs)) { //manual insert a Cb as last argument.
						proxyMethodArgs.push(NodeHandling.noOp);
					}

					var handler         = new NodeHandling.FailureHandler(stubAdapter, HandlerConstructor, proxyTarget);
					var interceptedArgs = handler.install(this, proxyMethodArgs, proxyMethodName);
					return proxyTarget[proxyMethodName].apply(this, interceptedArgs);

				};

			}

			return proxyTarget[proxyMethodName];

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
		SerializationError,
		DeserializionError
	];

	this.networkErrors = [
		TimeOutError,
		NoConnectionError
	];
};


HandlerNode.prototype.handleException = function (target) {

	var ctxt = this;
	var self = this;
	var err  = this.ctxt.callError;
	target   = target || this;

	var lookupMethod = function (handlerMethod) {

		//SPECIFIC EXCEPTIONS: check if or current node has the handlerMethod
		if (target[handlerMethod] && self.ctxt._handledExceptions.mayHandle(handlerMethod, target)) {
			console.log(target.prototype.toString(), handlerMethod, 'Priority: ', target.flagPriority);

			//if the priority flag is set, we indicate this so other won't also handle the exception.
			if (target.flagPriority) {
				self.ctxt._handledExceptions.setHandled(handlerMethod, target);
			}

			//apply the method
			target[handlerMethod].apply(ctxt);

			//call super
			target.super(ctxt);

		} else {
			//ALL EXCEPTIONS
			if (!target.onException) {
				//OnException method is not defined, continue in super.

				if (!target.super) {

					console.log(target.toString(), 'no handling method found', 'Priority: ', target.flagPriority);
					//need explicit constructor super method call for leaves
					target.constructor.super.apply(ctxt, [ctxt]);

				} else {

					console.log(target.prototype.toString(), 'no handling method found.', 'Priority: ', target.flagPriority);
					target.super.apply(ctxt, [ctxt]);

				}

			} else {

				console.log(target.prototype.toString(), 'onException', 'Priority: ', target.flagPriority);
				target.onException.apply(ctxt);

				if (target.super) {
					target.super(ctxt);
				} else {
					//We went through the entire handling tree.
					self.ctxt._handlingFinished();
				}
			}
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


if (typeof exports !== 'undefined') {
	global.makeFailureProxy = makeFailureProxy;
	global.HandlerNode      = HandlerNode;
}