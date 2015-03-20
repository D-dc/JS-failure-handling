'use strict';

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
var findCb = function(args){
		for(var i in args){
			var argument = args[i];
			if(typeof argument === 'function' && argument.length === 2)
				return i;
		}
	};


var makeFailureProxy = function (target, failureHandler){
	var proxyHandler = Object.create({});
	proxyHandler.get = function (target, name){

		if(typeof target[name] === 'function'){
			return function (){
				var args = Array.prototype.slice.call(arguments);
					if(findCb(args)){
						
						

						/*var o = Object.create(failureHandler);
						o.thunk={
							target:this,//target !!!! back to proxy
							args:args, 
							funcName:name
						}; */

						/*o.getOriginalCb= function(){
							var cbPosition = findCb(this.thunk.args);
						
							return this.thunk.args[cbPosition];
						};
						o.invokeCb= function(err, res){ 
							var oldCb = this.getOriginalCb();
							oldCb(err, res);
						};
						o.retry= function(){ //retry the whole call
							var org = this.thunk;
							var obj = org.target;
							obj[org.funcName].apply(obj, org.args);
						};
						o.fail= function(err){ //fail the original cb
							this.invokeCb(err);
						};
						o.succeed= function(res){ //succeed the original cb
							this.invokeCb(null, res);
						}


						console.log('AAA ', o);*/
						//return o.handle(target, name, this, args);

						return failureHandler.handle(target, name, this, args);
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

var TopNode = function(){
	console.log('TopNode created');
};

TopNode.prototype.onNetworkException = function(){
	throw new Error('Uncaught NetworkException.');
};
TopNode.prototype.onApplicationException  = function(){
	throw new Error('Uncaught onApplicationException.');
};
TopNode.prototype.onLibraryException  = function(){
	throw new Error('Uncaught onLibraryException.');
};
TopNode.prototype.onNativeException  = function(){
	throw new Error('Uncaught onNativeException.');
};


TopNode.prototype.handle = function(target, name, context, args){
	var self = this;
	//var untouchedArgs = args.slice(); //copy of original
	var cbPosition = findCb(args);

	if(cbPosition){
		var oldCb = args[cbPosition];

		//safety to make sure the original CB gets only invoked once!
		args[cbPosition] =  function(invoked, oldCb){
			return function (err, res){

				if(!invoked){
					console.log('call invoked');
					invoked=true;
					oldCb(err, res);
				}else{
					console.log('call suppressed');
				}
			};
		}(false, oldCb);
		
		//save of args
		//var untouchedArgs = args.slice();
		
		var ctxtObject = {
			thunk:{
				target:context,//target !!!! back to proxy
				args:args.slice(), 
				funcName:name
			}, 
			getOriginalCb: function(){
				var cbPosition = findCb(this.thunk.args);
			
				return this.thunk.args[cbPosition];
			},
			invokeCb: function(err, res){ 
				var oldCb = this.getOriginalCb();
				oldCb(err, res);
			},
			retry: function(){ //retry the whole call

				var org = this.thunk;
				var obj = org.target;
				installHandler(org.args, cbPosition, this);
				//obj[org.funcName].apply(obj, org.args);
				target[org.funcName].apply(obj, org.args);
				
			},
			fail: function(err){ //fail the original cb
				this.invokeCb(err);
			},
			succeed: function(res){ //succeed the original cb
				this.invokeCb(null, res);
			}
		};

		//install the handler				
		var installHandler = function(args, cbPosition, contextObject){
			var oldCb = args[cbPosition];
			args[cbPosition] = function (err, res){
				console.log('CB');
				
				//if err when callback gets invoked, set the variables of the object
				//and start the handling again.
				if(err){
					
					contextObject.callbackError = err;
					contextObject.callbackResult = res;
					return self.handleException(contextObject); 
				
				}	

				//no err, just invoke the normal cb.
				return oldCb(err, res);
			};	
		};

		installHandler(args, cbPosition, ctxtObject);
				
		/*//install the handler
		oldCb = args[cbPosition];
		args[cbPosition] = function (err, res){
			if(err){
				self.callbackError = err;
				self.callbackResult = res;
				return self.handleException({
						thunk:{
							target:context,//target !!!! back to proxy
							args:untouchedArgs, 
							funcName:name
						}, 
						callbackError: err,
						callbackResult:res,
						getOriginalCb: function(){
							var cbPosition = findCb(this.thunk.args);
						
							return this.thunk.args[cbPosition];
						},
						invokeCb: function(err, res){ 
							var oldCb = this.getOriginalCb();
							oldCb(err, res);
						},
						retry: function(){ //retry the whole call
							var org = this.thunk;
							var obj = org.target;
							obj[org.funcName].apply(obj, org.args);
						},
						fail: function(err){ //fail the original cb
							this.invokeCb(err);
						},
						succeed: function(res){ //succeed the original cb
							this.invokeCb(null, res);
						}
					}); 
			}	
			return oldCb(err, res);
		};	*/	
	}

	return target[name].apply(context, args);
};

//TopNode.prototype.handleException = function(){	
TopNode.prototype.handleException = function(originalCall){

	var err = originalCall.callbackError;
	//console.log(' handleException', this)
	var nativeErrors = [
		EvalError, 
		RangeError, 
		ReferenceError, 
		SyntaxError, 
		TypeError, 
		URIError
	];

	if(err && nativeErrors.some(function(error){
						return (err instanceof error)
					})){
		this.onNativeException(originalCall);
	}else{
		this.onNetworkException(originalCall);
	}
};

TopNode.prototype.superHandle = function(originalCall){
	Object.getPrototypeOf(this.constructor.prototype).handleException(originalCall);
	//Object.getPrototypeOf(this.constructor.prototype).handleException.call(this);
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var TierNode = function(){
	console.log('TierNode created');
};
TierNode.prototype = new TopNode();
TierNode.prototype.constructor = TierNode;

TierNode.prototype.onNetworkException = function(originalCall){
	console.log(' Tier onNetworkException', originalCall);
	originalCall.invokeCb(originalCall.callbackError, originalCall.callbackResult);
};

TierNode.prototype.onApplicationException  = function(originalCall){
	console.log(' Tier onApplicationException');
};

TierNode.prototype.onLibraryException  = function(originalCall){
	console.log(' Tier onLibraryException');
};

TierNode.prototype.onNativeException  = function(originalCall){
	console.log(' Tier onNativeException');
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var BlockNode = function(){
	console.log('BlockNode created');
};
BlockNode.prototype = new TierNode();//Object.create(TierNode.prototype);
BlockNode.prototype.constructor = BlockNode;
/*BlockNode.super = function (methodToCall){
	Object.getPrototypeOf(BlockNode.prototype)[methodToCall].call(this);
};*/

BlockNode.prototype.onNetworkException = function(originalCall){
	console.log(' Block onNetworkException', originalCall);
	//BlockNode.super('onNetworkException');
	this.superHandle(originalCall);
};

BlockNode.prototype.onApplicationException  = function(originalCall){
	console.log(' Block onApplicationException');
	//BlockNode.super('onApplicationException');
	this.superHandle(originalCall);
};

BlockNode.prototype.onLibraryException  = function(originalCall){
	console.log(' Block onLibraryException');
	//BlockNode.super('onLibraryException');
	this.superHandle(originalCall);
};

BlockNode.prototype.onNativeException  = function(originalCall){
	console.log(' Block onNativeException');
	//this.super('onNativeException');
	this.superHandle(originalCall);
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var CallA = function(){
	console.log('CallA created');
	//this.super = this.__proto__;//new BlockNode();
};
CallA.prototype = new BlockNode();
CallA.prototype.constructor = CallA;
/*CallA.super = function (methodToCall){
	Object.getPrototypeOf(CallA.prototype)[methodToCall].call(this);
};*/

CallA.prototype.onNetworkException = function(originalCall){
	console.log(' CallA onNetworkException', originalCall);
	//CallA.super('onNetworkException');
	this.superHandle(originalCall);
};

CallA.prototype.onApplicationException  = function(originalCall){
	console.log(' CallA onApplicationException');
	//CallA.super('onApplicationException');
	this.superHandle(originalCall);
};

CallA.prototype.onLibraryException  = function(originalCall){
	console.log(' CallA onLibraryException');
	//CallA.super('onLibraryException');
	this.superHandle(originalCall);
};

CallA.prototype.onNativeException  = function(originalCall){
	console.log(' CallA onNativeException');
	//CallA.super('onNativeException');
	this.superHandle(originalCall);
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var CallB = function(originalCall){
	console.log('CallB created'); 
};
CallB.prototype = new BlockNode();//Object.create(BlockNode.prototype);
CallB.prototype.constructor = CallB;
/*CallB.super = function (methodToCall){
	Object.getPrototypeOf(CallB.prototype).methodToCall();//[methodToCall].call(this);
};*/

CallB.prototype.onNetworkException = function(originalCall){
	console.log(' CallB onNetworkException', this);

	//1. INVOKING OLD CB
	//originalCall.invokeCb(originalCall.callbackError, originalCall.callbackResult);

	//2. REINITIALIZING COMPLETE CALL
	//originalCall.retry();
					if(!originalCall.ctr) originalCall.ctr=0;
				originalCall.ctr++;
				console.log('retrying ', originalCall.ctr);
				originalCall.retry();
				if(originalCall.ctr===3) this.superHandle(originalCall);

	//3. PROPAGATE TO SUPER
	//this.superHandle(originalCall);
	//CallB.super('onNetworkException', originalCall);

};

CallB.prototype.onApplicationException  = function(originalCall){
	console.log(' CallB onApplicationException');
	//CallB.super('onApplicationException');
	this.superHandle(originalCall);
};

CallB.prototype.onLibraryException  = function(originalCall){
	console.log(' CallB onLibraryException');
	//CallB.super('onLibraryException');
	this.superHandle(originalCall);
};

CallB.prototype.onNativeException  = function(originalCall){
	console.log(' CallB onNativeException');
	//CallB.super('onNativeException');
	this.superHandle(originalCall);
};