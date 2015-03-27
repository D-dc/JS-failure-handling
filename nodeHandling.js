'use strict';
if(typeof exports !== 'undefined')
	var p = require('./reflect.js')


//works on node v0.12.1
//use: node --harmony-proxies


/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/


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

IDEE: Proxies op voorhand aanmaken,
max evenveel proxies als handlers, evt minder
then you can just pick 'right' proxy @ call

Mogelijk om prototype van Proxy handler aan tree te hangen.
Object met data in onder aan de tree te hangen. Maar probleem om bij het
omhoog gaan in de chain referentie te behouden naar dat object ('this' staat op the current node)
dus je moet al zelf een referentie doorgeven
Nu: Object met originele call, cb(err, res) doorgevens zodat mogelijk:
  CB op te roepen (vb default success), CB niet meer oproepen op failure,
  retry ook mogelijk
Maar dus niet catchallexception function die terug van onderaan begint
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

var findCb = function(args){
		for(var i in args){
			var argument = args[i];
			if(typeof argument === 'function' && argument.length === 2)
				return i;
		}
	};


var makeFailureProxy = function (target, failureHandler, contextualHandler){
	//console.log(failureHandler);

	/*var ExcFunc;
	if(typeof window !== 'undefined' && window[failureHandler]){ //browser

		ExcFunc = window[failureHandler];

	}else if(typeof global !== 'undefined' && global[failureHandler])	{ //node

		ExcFunc = global[failureHandler];

	}else{
		
		return new Error('FailureHandler not defined, ' + failureHandler);

	}*/	


	var proxyHandler = Object.create({});
	proxyHandler.get = function (target, name){
		if(typeof target[name] === 'function'){
			
			return function (){
				var args = Array.prototype.slice.call(arguments);
				var cbPosition = findCb(args);
				if(cbPosition){
						
					//Make sure the original CB gets only invoked once!
					args[cbPosition] = function(invoked, oldCb){
						return function (err, res){

							if(!invoked){
								invoked=true;
								oldCb(err, res);
							}else{
								console.log('-> call suppressed');
							}
						};
					}(false, args[cbPosition]);

					var ctxtObject = {
						thunk:{
							target:this,//target !!!! back to proxy
							args:args.slice(),  //copy
							funcName:name
						}, 
						getOriginalCb: function(){
							return this.thunk.args[cbPosition];
						},
						invokeCb: function(err, res){ 
							var originalCb = this.getOriginalCb();
							originalCb(err, res);
						},
						retry: function(){ //retry the whole call

							var org = this.thunk;
							var obj = org.target;
							var argsCopy = org.args.slice();
							installHandler(argsCopy, this);
							target[org.funcName].apply(obj, argsCopy);
							
						},
						fail: function(err){ //fail the original cb
							this.invokeCb(err);
						},
						succeed: function(res){ //succeed the original cb
							this.invokeCb(null, res);
						}
					};


					//intercept the error				
					var installHandler = function(args, contextObject){
						var oldCb = args[cbPosition];
						args[cbPosition] = function (err, res){

							//if err when callback gets invoked, set the variables of the object
							//and start the handling again.
							if(err){
								
								console.log('Error in callback');
								contextObject.callbackError = err;
								contextObject.callbackResult = res;
								failureHandler.ctxt = contextObject;
								return failureHandler.handleException(); 
							
							}	

							//no err, just invoke the normal cb.
							return oldCb(err, res);
						};	
					};

					//failureHandler = new ExcFunc();	
					failureHandler.ctxt = ctxtObject;

					if(contextualHandler){
						var leaf = Object.create(HandlerNode.prototype);
						leaf.parent = failureHandler;
						leaf.onException = function(){
							contextualHandler();
							this.super();
						};
						failureHandler = leaf;
					}

					installHandler(args, ctxtObject);
					return target[name].apply(this, args);
				
				}else{
					
					return target[name].apply(this, args);
				
				}
			};
			
		}

		return target[name];
		
	};
	return new Proxy(target, proxyHandler);

};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var HandlerNode = function(){
	console.log('TopNode created');
};
	
HandlerNode.prototype.handleException = function(ctxt, target){

	var self = this;

	ctxt = ctxt || self;
	target = target || self;

	var err = this.ctxt.callbackError;

	var nativeErrors = [
		EvalError, 
		RangeError, 
		ReferenceError, 
		SyntaxError, 
		TypeError, 
		URIError
	];

	var checkInvokeHandler = function(handlerMethod){
		//console.log(target, handlerMethod)
		//check if or current node has the handlerMethod, if not call onCatchAll
		if(target[handlerMethod]){
			target[handlerMethod].apply(ctxt);	
		}else{

			if(!target.onException) {
				
				throw new Error('Need either onCatchAllMethod or specific method on' + self);
			
			}else{
				target.onException.apply(ctxt);
			}		
			
		}
		//TODO can perform super() call here	
			
	}
   


	if(err && nativeErrors.some(function(error){
						return (err instanceof error);
					})){
		checkInvokeHandler('onNativeException');
	}else{
		checkInvokeHandler('onNetworkException');
	}
};

/*HandlerNode.prototype.super = function(){
	if(this.parent){
		this.parent.ctxt = this.ctxt;
		this.parent.handleException();
	}
};*/

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var TopNode = function(){
	console.log('TopNode created');
};
TopNode.prototype = new HandlerNode();
TopNode.prototype.constructor = TopNode;
TopNode.prototype.toString = function(){
	return 'TopNode';
};

TopNode.prototype.onException = function(){
	throw new Error('Reached top, no handler');
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var TierNode = function(){
	console.log('TierNode created');
};
TierNode.prototype = new HandlerNode();
TierNode.prototype.constructor = TierNode;
TierNode.toString = function(){
	return 'TierNode';
};

TierNode.onException = function(){
	console.log(' Tier onException', this.ctxt);
};

TierNode.onNetworkException = function(){
	console.log(' Tier onNetworkException', this.ctxt);
	//this.super();
	this.ctxt.invokeCb(this.ctxt.callbackError, this.ctxt.callbackResult);

	//this.super();
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var BlockNode = function(){
	console.log('BlockNode created');
};
BlockNode.super = function(target){
	target.handleException(target, TierNode);
};
BlockNode.prototype = new TierNode();
BlockNode.prototype.constructor = BlockNode;
BlockNode.toString = function(){
	return 'BlockNode';
};

BlockNode.onException = function(){
	console.log(' BlockNode onException', this.ctxt);
	BlockNode.super(this);
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var CallA = function(){
	console.log('CallA created');
};
CallA.super = function(target){
	target.handleException(target, BlockNode);
};
CallA.prototype = new BlockNode();
CallA.prototype.constructor = CallA;
CallA.prototype.toString = function(){
	return 'CallA';
};

CallA.onException = function(){
	console.log(' CallA onException', this.ctxt);
	//this.super();	
	//this.ctxt.invokeCb(this.ctxt.callbackError, this.ctxt.callbackResult);

	CallA.super(this);
};

//GENERATED
var LeafA = function(){
	this.ctxt = null;
	//put here state from ALL its prototypes!
};
LeafA.super = function(target){
	target.handleException(target, CallA);
};
LeafA.prototype = new CallA();
LeafA.prototype.onException = function(){
	console.log('leaf A');
	LeafA.super(this);
};
//var makeLeaf = function(proto, )
//var underA = Object.create(CallA);


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////



var CallB = function(ctxt){
	console.log('CallB created'); 
	this.parent = new BlockNode();
	this.ctxt=ctxt;
};
CallB.prototype = new HandlerNode();
CallB.prototype.constructor = CallB;
CallB.toString = function(){
	return 'CallB';
};
CallB.super = function(target){
	target.handleException(target, BlockNode);
};
CallB.onNetworkException = function(){
	console.log(' CallB onNetworkException', this.ctxt);

	//1. INVOKING OLD CB
	//originalCall.invokeCb(originalCall.callbackError, originalCall.callbackResult);

	//2. REINITIALIZING COMPLETE CALL
	//originalCall.retry();
	if(!this.ctr) this.ctr=0;
		this.ctr++;
		console.log('retrying ', this.ctr);
		
		
		if(this.ctr >= 2){
			CallB.super(this);
			this.ctr=0;
			//debugger
		} else {
			this.ctxt.retry();
		}
	//3. PROPAGATE TO SUPER
	//this.super();
	//this.super(originalCall);
	//CallB.super('onNetworkException', originalCall);

};

CallB.onApplicationException = function(){
	console.log(' CallB onApplicationException');
	CallB.super(this);
};

CallB.onLibraryException = function(){
	console.log(' CallB onLibraryException');
	CallB.super(this);
};

CallB.onNativeException = function(){
	console.log(' CallB onNativeException');
	CallB.super(this);
};


//////////////////////////////

var LeafB = function(){
	this.ctxt = null;
	//put here state from ALL its prototypes!
};
LeafB.super = function(target){
	target.handleException(target, CallB);
};
LeafB.prototype = new CallB();
LeafB.prototype.onException = function(){
	console.log('leaf B');
	LeafB.super(this);
};


if(typeof exports !== 'undefined'){
	global.makeFailureProxy = makeFailureProxy;
	global.LeafB = LeafB;
	global.LeafA = LeafA;
}
