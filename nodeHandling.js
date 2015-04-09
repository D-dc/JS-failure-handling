'use strict';

if (typeof exports !== 'undefined') {
	require('./reflect.js');
}


//works on node v0.12.1
//use: node --harmony-proxies


/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


/*
EXPLICIT MESSAGE PASSING.

* Maybe:
No retransmission
May or may not be received
(Omission failures, crash failures)
=> Just do no failure handling

* At-least-once:
If no ack, retransmit msg,
retransmission not filtered
NO crash failure (0 deliveries then)
Operation can be invoked more than once
=> can use DUE to retransmit msg
=> if DueExceptionError, retransmit

* At-most-once:
retransmit if no ack,
receiver filter duplicates (vb ctr).
Masks omissions, still crash failures
=> again DUE

* Exact-once:
Crash must recover
persistance needed to keep messages after crash failure
Receiver: Filter,

*/


var HandlerManager = function () {
	//console.log('new HandlerManager');
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


var makeFailureProxy = function (stubAdapter) {

	return function (target, failureHandler, contextualHandler) {
		var self = this;
		var HandlerConstructor;
		if (typeof window !== 'undefined' && window[failureHandler]) { //browser

			HandlerConstructor = window[failureHandler];

		} else if (typeof global !== 'undefined' && global[failureHandler]) { //node

			HandlerConstructor = global[failureHandler];

		} else {

			throw new Error('FailureHandler not defined, ' + failureHandler);

		}

		//intercept the error		
		var installHandler = function (proxy, proxyTarget, proxyMethodArgs, proxyMethodName, failureHandler) {
			var oldCb = stubAdapter.getRpcContinuation(proxyMethodArgs);
			var savedArgs = proxyMethodArgs.slice();

			//intercept callback arguments and use handler if 'error' argument is set.
			stubAdapter.setRpcContinuation(proxyMethodArgs, function () {
				console.log('--> Proxy failure handler.', stubAdapter.getRpcFunctionName(proxyMethodArgs), stubAdapter.getRpcArgs(proxyMethodArgs));

				var rpcError = stubAdapter.getContinuationError(arguments),
					rpcResult = stubAdapter.getContinuationResult(arguments),
					rpcRetry = stubAdapter.getContinuationRetry(arguments);

				if (!rpcError) {
					console.log('Normal result!');
					return oldCb(rpcError, rpcResult); //just execute originalCB
				}

				//either we get an existing failureHandler (e.g. retry performed), 
				//need to reuse that existing handler to keep its state.
				var argsForContext = savedArgs;

				if (!failureHandler) {
					console.log('NEW Handler');

					//start with a new handler
					failureHandler = new HandlerConstructor(); //!
					var newArgs = savedArgs.slice();

					//Make sure the original CB gets only invoked once per handler!
					stubAdapter.setRpcContinuation(newArgs, function (invoked, oldCb) {
						return function () {
							var err = stubAdapter.getContinuationError(arguments),
								res = stubAdapter.getContinuationError(arguments);

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

				var makeContextObject = function () {
					var rpcFunctionName = stubAdapter.getRpcFunctionName(proxyMethodArgs),
						rpcArgs = stubAdapter.getRpcArgs(proxyMethodArgs);

					return {
						toString: function () {
							return 'RPCCALL: ' + this.callName + ' ' + this.callArgs() + ' ' + this.callError + ' ' + this.callResult + ' \n STUB: ' + this.stubCall.methodName;
						},
						handledExceptions: new HandlerManager(),

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
						callError: rpcError,
						callResult: rpcResult,
						callRetry: rpcRetry,
						_getOriginalCb: function () {

							return stubAdapter.getRpcContinuation(this.stubCall.methodArgs());

						},

						//RETRY: We retry the ORIGINAL call, same args. (Takes into account omission failures, callee side-effects)
						retry: function (continuation) {
							var self = this;
							var retry = this.callRetry;
							if (retry) {
								console.log('retr from lib', this.toString());
								// return retry(function (originalCB) {
								// 	return function (err, res, retry) {
								// 		//SHOULD DO RETRY
								// self.callError = err;
								// self.callResult = res;
								// self.callRetry = retry;
								// 		originalCB(err, res, retry);
								// 	};
								// }); //library defined retry
								return retry(continuation);
							}

						},

						//Perform a different call
						alternateCall: function (newCallName, newCallArgs, continuation) {
							var stubCall = this.stubCall;
							var newMethodArgs = stubAdapter.buildNewRpcArgs(newCallName, newCallArgs, continuation);
							var newArgs = installHandler(proxy, proxyTarget, newMethodArgs, proxyMethodName, failureHandler); //currentHandler);
							//Directly on the proxyTarget, we already intercepted the args to use 'currentHandler' again.
							proxyTarget[stubCall.methodName].apply(proxyTarget, newArgs);
						},

						//Invoke the callback (e.g. for giving default return values)
						continue: function (err, res, retry) {
							var originalCb = this._getOriginalCb();
							var newArgs = stubAdapter.buildNewCbArgs(err, res, retry);

							originalCb.apply(this.stub, newArgs);

						},

						//Continue the continuation as failed
						fail: function (err) {

							this.continue(err);

						},

						//Continue the continuation as succeeded
						succeed: function (res) {

							this.continue(null, res);

						}
					};

				};

				failureHandler.ctxt = makeContextObject();
				console.log(failureHandler.ctxt.toString());

				return failureHandler.handleException();

			});

			return proxyMethodArgs;
		};


		var proxyHandler = Object.create({});
		proxyHandler.get = function (proxyTarget, proxyMethodName) {
			if (typeof proxyTarget[proxyMethodName] === 'function' && proxyMethodName === stubAdapter.stubMethodName) {
				return function () {
					var proxyMethodArgs = Array.prototype.slice.call(arguments);

					if (!stubAdapter.getRpcContinuation(proxyMethodArgs)) { //manual insert a Cb as last argument.
						var cb = function () {
							// var err = stubAdapter.getContinuationError(arguments),
							// 	res = stubAdapter.getContinuationResult(arguments);
							console.log('inserted Cb.');
						};
						proxyMethodArgs.push(cb);

					}

					// if(contextualHandler){
					// 	var leaf = Object.create(HandlerNode.prototype);
					// 	leaf.super = failureHandler;
					// 	leaf.onException = function(){
					// 		contextualHandler();
					// 		this.super();
					// 	};
					// 	failureHandler = leaf;
					// }


					var interceptedArgs = installHandler(this, proxyTarget, proxyMethodArgs, proxyMethodName);
					return proxyTarget[proxyMethodName].apply(this, interceptedArgs);

				};

			}

			return proxyTarget[proxyMethodName];

		};

		return new Proxy(target, proxyHandler);
	};
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

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
		LeaseExpiredError,
		NoConnectionError
	];
};

HandlerNode.prototype.IsException = function (exceptionType) {
	return this.ctxt.callError instanceof exceptionType;
};

HandlerNode.prototype.handleException = function (target) {

	var ctxt = this;
	var self = this;
	var err = this.ctxt.callError;
	target = target || this;

	var lookupMethod = function (handlerMethod) {
		//console.log(self.ctxt.handledExceptions.handledExceptions);

		//SPECIFIC EXCEPTIONS: check if or current node has the handlerMethod
		if (target[handlerMethod] && self.ctxt.handledExceptions.mayHandle(handlerMethod, target)) {
			console.log(target.prototype.toString(), handlerMethod, 'Priority: ', target.flagPriority);

			//if the priority flag is set, we indicate this so other won't also handle the exception.
			if (target.flagPriority) {
				console.log('flagPriority set');
				self.ctxt.handledExceptions.setHandled(handlerMethod, target);
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

					console.log(target.toString(), 'no handling method found.', 'Priority: ', target.flagPriority);
					//need explicit constructor super method call for leaves
					target.constructor.super.apply(ctxt, [ctxt]);

				} else {

					console.log(target.prototype.toString(), 'no handling method found.', 'Priority: ', target.flagPriority);
					target.super.apply(ctxt, [ctxt]);

				}

			} else {

				console.log(target.prototype.toString(), 'onException', 'Priority: ', target.flagPriority);
				target.onException.apply(ctxt);

				if (target.super)
					target.super(ctxt);
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
	global.HandlerNode = HandlerNode;
}