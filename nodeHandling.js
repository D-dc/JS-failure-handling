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

	var ExcFunc;
	if(typeof window !== 'undefined' && window[failureHandler]){ //browser

		ExcFunc = window[failureHandler];

	}else if(typeof global !== 'undefined' && global[failureHandler])	{ //node

		ExcFunc = global[failureHandler];

	}else{
		
		return new Error('FailureHandler not defined, ' + failureHandler);

	}	


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
						callError: null,
						callResult: null, 
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
								contextObject.callError = err;
								contextObject.callResult = res;
								failureHandler.ctxt = contextObject;
								return failureHandler.handleException(); 
							
							}	

							//no err, just invoke the normal cb.
							return oldCb(err, res);
						};	
					};

					failureHandler = new ExcFunc();	
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

	var err = this.ctxt.callError;

	var nativeErrors = [
		EvalError, 
		RangeError, 
		ReferenceError, 
		SyntaxError, 
		TypeError, 
		URIError
	];

	var libraryErrors = [
		FunctionNotFoundError,
		SerializationError,
		DeserializionError
	];

	var networkErrors = [
		TimeOutError,
		LeaseExpiredError,
		NoConnectionError
	];

	var checkInvokeHandler = function(handlerMethod){
		//console.log(target, handlerMethod)
		//check if or current node has the handlerMethod, if not call onCatchAll
		if(target[handlerMethod]){
			target[handlerMethod].apply(ctxt);	
		}else{

			if(!target.onException) {
				
				throw new Error('Need either onException or specific method on' + target);
			
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
	}else if(err && libraryErrors.some(function(error){
						return (err instanceof error);
					})){
		checkInvokeHandler('onLibraryException');
	}else if(err && networkErrors.some(function(error){
						return (err instanceof error);
					})){		
		checkInvokeHandler('onNetworkException');
	}else{
		checkInvokeHandler('onApplicationException');
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

TopNode.onException = function(){
	//throw new Error('Reached top, no handler');
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
// retry on network exceptions
var Node1 = function(){
	console.log('Node1 created');
};
Node1.super = function(target){
	target.handleException(target, TopNode);
};
Node1.prototype = new TopNode();
Node1.prototype.constructor = Node1;
Node1.toString = function(){
	return 'Node1';
};


Node1.onNetworkException = function(){
	console.log(' Node1 onNetworkException', this.ctxt);
	var self = this;

	Node1.super(this);
	// if(!this.ctr) this.ctr=0;
	// 	this.ctr++;
	// 	console.log('retrying ', this.ctr);
		
		
	// 	if(this.ctr >= 2){
	// 		Node1.super(this);
	// 		this.ctr=0;
	// 		//debugger
	// 	} else {
			
	// 		setTimeout(function (){
	// 			self.ctxt.retry();
	// 		}, 2000);
	// 	}

};

Node1.onException = function(){
	console.log(' Node1 onException');
	Node1.super(this);
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var Node2 = function(){
	console.log('Node2 created');
};
Node2.super = function(target){
	target.handleException(target, Node1);
};
Node2.prototype = new Node1();
Node2.prototype.constructor = Node2;
Node2.toString = function(){
	return 'Node2';
};

Node2.onException = function(){
	console.log(' Node2 onException', this.ctxt);
	console.error('RemoteException: ', this.ctxt.callError);
	Node2.super(this);
};

Node2.onNativeException = function(){
	console.log(' Node2 onNativeException', this.ctxt);
	console.error('RemoteException: ', this.ctxt.callError);
	console.info(this.ctxt.callError.stack);
	Node2.super(this);
};

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var Node3 = function(){
	console.log('Node3 created');
};
Node3.super = function(target){
	target.handleException(target, Node2);
};
Node3.prototype = new Node2();
Node3.prototype.constructor = Node3;
Node3.toString = function(){
	return 'Node3';
};

Node3.onApplicationException = function(){
	var error = this.ctxt.callError;
	displayGUIAlert(error.message);
	Node3.super(this);
};
Node3.onException = function(){
	console.log('leaf A');
	Node3.super(this);
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var Node4 = function(){
	console.log('Node4 created');
};
Node4.super = function(target){
	target.handleException(target, Node3);
};
Node4.prototype = new Node3();
Node4.prototype.constructor = Node4;
Node4.prototype.toString = function(){
	return 'Node4';
};
Node4.onException = function(){

	Node4.super(this);
};

Node4.onNetworkException = function(){
	var self = this;
	console.log(' Node4 onNetworkException', this.ctxt);
	var stub = this.ctxt.thunk.target;
	stub.once('connect', function (){
		self.ctxt.retry();
	});
	//todo remove retry if callback gets executed anyway

	Node4.super(this);
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

//GENERATED
var LeafA = function(){
	this.ctxt = null;
	//put here state from ALL its prototypes!
};
LeafA.super = function(target){
	target.handleException(target, Node4);
};
LeafA.prototype = new Node4();
LeafA.prototype.onException = function(){
	console.log('leaf A');
	LeafA.super(this);
};


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////



var CallB = function(ctxt){
	console.log('CallB created'); 
	this.parent = new Node3();
	this.ctxt=ctxt;
};
CallB.prototype = new HandlerNode();
CallB.prototype.constructor = CallB;
CallB.toString = function(){
	return 'CallB';
};
CallB.super = function(target){
	target.handleException(target, Node3);
};
CallB.onApplicationException = function(){
	console.log(' CallB onApplicationException', this.ctxt);

	if(this.ctxt.callError instanceof UsernameNotAllowedError){
		var rpcArgs = this.ctxt.thunk.args;
		var name = rpcArgs[1][1];
		var rand = Math.floor((Math.random() * 100) + 1);
		var newName = name+rand;
		rpcArgs[1][1] =newName;
		
		var cb = this.ctxt.getOriginalCb;
		rpcArgs[2] = function (err, res){
			console.log('EEEEEEE', newName)
			if(!err){
				$author.val(newName);
			}
			cb(err, res)
		}
		this.ctxt.retry();
	}else{
		CallB.super(this);
	}
	//1. INVOKING OLD CB
	//originalCall.invokeCb(originalCall.callError, originalCall.callResult);

	//2. REINITIALIZING COMPLETE CALL
	//originalCall.retry();
	// if(!this.ctr) this.ctr=0;
	// 	this.ctr++;
	// 	console.log('retrying ', this.ctr);
		
		
	// 	if(this.ctr >= 2){
	// 		CallB.super(this);
	// 		this.ctr=0;
	// 		//debugger
	// 	} else {
	// 		this.ctxt.retry();
	// 	}
	//3. PROPAGATE TO SUPER
	//this.super();
	//this.super(originalCall);
	

};

CallB.onException = function(){
	console.log(' CallB onException');
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
