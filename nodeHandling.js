'use strict';

var log = function() {};

if(typeof exports !== 'undefined'){
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

// var makeNodeProxy = function(target){
// 	var p = new Proxy(target, {
// 		get: function(target, name){
// 			if(typeof target[name] === 'function'){
// 				return function (){
// 					var args = Array.prototype.slice.call(arguments);
// 					console.log(name);//, target.ctxt[name])
// 					if(target[name]){
// 						//return target[name];
// 						console.log('found');
// 						return target[name].apply(p, args);
				
// 					}else if(target.ctxt[name]){
// 						console.log('ctxt');
// 						//return target.ctxt[name];
// 						return target.ctxt[name].apply(p, args);
// 					}else{
// 						console.log("not defined",target.ctxt);
// 						return target[name];
// 					}
// 				}
// 			}else{
// 				return target[name];
// 			}
// 		}
// 	});
// 	return p;
// };


var HandlerManager = function(){
	console.log('new HandlerManager');
	this.handledExceptions = {};
};

HandlerManager.prototype.setHandled = function(handleMethod, byHandler){
	this.handledExceptions[handleMethod] = byHandler;
};

HandlerManager.prototype.mayHandle = function(handleMethod, byHandler){
	if(!byHandler){
		return !(this.handledExceptions[handleMethod]);
	}

	return !this.handledExceptions[handleMethod] || this.handledExceptions[handleMethod] === byHandler;

};

var findCb = function(args){
	for(var i in args){
		var argument = args[i];
		if(typeof argument === 'function' && argument.length === 2)
			return i;
	}
};


var makeFailureProxy = function (target, failureHandler, contextualHandler){

	var HandlerConstructor;
	if(typeof window !== 'undefined' && window[failureHandler]){ //browser

		HandlerConstructor = window[failureHandler];

	}else if(typeof global !== 'undefined' && global[failureHandler]){ //node

		HandlerConstructor = global[failureHandler];

	}else{
		
		throw new Error('FailureHandler not defined, ' + failureHandler);

	}

	var makeContextObject = function(target, args, functionName, cbPosition, callError, callResult, failureHandler){
		
		return {
			handledExceptions: new HandlerManager(),
			thunk:{
				target:target,//this,//target !!!! back to proxy
				args:args,
				funcName:functionName
			},
			callError: callError,
			callResult: callResult, 
			getOriginalCb: function(){

				return this.thunk.args[cbPosition];

			},
			invokeCb: function(err, res){ 
				
				var originalCb = this.getOriginalCb();
				originalCb(err, res);

			},
			retry: function(){ //retry the whole call

				var thunk = this.thunk;
				var newArgs = installHandler(target, thunk.args, functionName, cbPosition, failureHandler);
				console.log('retrying', newArgs);
				target[thunk.funcName].apply(thunk.target, newArgs);
				
			},
			fail: function(err){ //fail the original cb
				
				this.invokeCb(err);

			},
			succeed: function(res){ //succeed the original cb
				
				this.invokeCb(null, res);
				
			}
		};
	
	};

	//intercept the error		
	var installHandler = function(target, args, functionName, cbPosition, failureHandler){
		var oldCb = args[cbPosition];
		var savedArgs = args.slice();
		
		args[cbPosition] = function (err, res){
			
			if(!err)
				return oldCb(err, res);//just execute originalCB

			
			console.log('Error received');
			
			//either we get an existing failureHandler (e.g. retry performed), 
			//need to reuse that existing handler to keep its state.
			var currentHandler = failureHandler;
			var argsForContext = savedArgs;

			if(!currentHandler){
				//start with a new handler
			 	currentHandler = new HandlerConstructor();//!
			 	var newArgs = savedArgs.slice();

			 	//Make sure the original CB gets only invoked once per handler!
				newArgs[cbPosition] = function(invoked, oldCb){
					return function (err, res){

						if(!invoked){
							invoked = true;
							oldCb(err, res);
						}else{
							console.log('-> call suppressed');
						}
					};
				}(false, newArgs[cbPosition]);

				argsForContext = newArgs;	
			}

			currentHandler.ctxt = makeContextObject(target, argsForContext, functionName, cbPosition, err, res, currentHandler);
			return currentHandler.handleException(); 
			
		};

		return args;	
	};	


	var proxyHandler = Object.create({});
	proxyHandler.get = function (proxyTarget, proxyName){
		if(typeof proxyTarget[proxyName] === 'function'){
			
			return function (){
				var proxyFunctionArgs = Array.prototype.slice.call(arguments);
				var cbPosition = findCb(proxyFunctionArgs);
				if(cbPosition){

					// if(contextualHandler){
					// 	var leaf = Object.create(HandlerNode.prototype);
					// 	leaf.super = failureHandler;
					// 	leaf.onException = function(){
					// 		contextualHandler();
					// 		this.super();
					// 	};
					// 	failureHandler = leaf;
					// }

					var interceptedArgs = installHandler(proxyTarget, proxyFunctionArgs, proxyName, cbPosition);
					return proxyTarget[proxyName].apply(this, interceptedArgs);
				
				}else{
					// we don't have a CB, thus no handling either.
					return proxyTarget[proxyName].apply(this, proxyFunctionArgs);
				
				}
			};
			
		}

		return proxyTarget[proxyName];
		
	};
	
	return new Proxy(target, proxyHandler);

};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var HandlerNode = function(){
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

HandlerNode.prototype.IsException = function(exceptionType){
	return this.ctxt.callError instanceof exceptionType;
};
	
HandlerNode.prototype.handleException = function(target){

	var ctxt = this;
	var self = this;
	var err = this.ctxt.callError;
	target = target || this;

	var lookupMethod = function(handlerMethod){
		console.log(self.ctxt.handledExceptions.handledExceptions);
		
		//SPECIFIC EXCEPTIONS: check if or current node has the handlerMethod
		if(target[handlerMethod] && self.ctxt.handledExceptions.mayHandle(handlerMethod, target)){
			console.log(target.prototype.toString(), handlerMethod, 'Priority: ', target.flagPriority);
			
			//if the priority flag is set, we indicate this so other won't also handle the exception.
			if(target.flagPriority){
				console.log('flagPriority set');
				self.ctxt.handledExceptions.setHandled(handlerMethod, target);
			} 

			//apply the method
			target[handlerMethod].apply(ctxt);	

			//call super
			target.super(ctxt);

			
		
		}else{
		//ALL EXCEPTIONS
			if(!target.onException) {
				//OnException method is not defined, continue in super.
				
				if(!target.super){
					
					console.log(target.toString(), 'no handling method found', 'Priority: ', target.flagPriority);
					//need explicit constructor super method call for leaves
					target.constructor.super.apply(ctxt, [ctxt]);

				}else{
					
					console.log(target.prototype.toString(), 'no handling method found.', 'Priority: ', target.flagPriority);
					target.super.apply(ctxt, [ctxt]);
				
				}

			}else{

				console.log(target.prototype.toString(), 'onException', 'Priority: ', target.flagPriority);
				target.onException.apply(ctxt);

				if(target.super)
					target.super(ctxt);
			}		
			
		}

	};
   

	var checkOfErrorType = function(err, errType){
		return errType.some(function(error){
						return (err instanceof error);
					});
	};

	if(err && checkOfErrorType(err, this.nativeErrors)){
		
		lookupMethod('onNativeException');
	
	}else if(err && checkOfErrorType(err, this.libraryErrors)){
		
		lookupMethod('onLibraryException');
	
	}else if(err && checkOfErrorType(err, this.networkErrors)){		
		
		lookupMethod('onNetworkException');
	
	}else{
		
		lookupMethod('onApplicationException');
	
	}
};


if(typeof exports !== 'undefined'){
	global.makeFailureProxy = makeFailureProxy;
	global.HandlerNode = HandlerNode;
}
