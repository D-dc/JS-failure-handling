'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/
var log = function() {};

if(typeof exports !== 'undefined'){
	var p = require('./reflect.js')
	require('./logSingleton.js')
	//var log = require('debug')('log');
}


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

	var self = this,
		err = this.ctxt.callError;

	ctxt = ctxt || self;
	target = target || self;

	var invokeMethod = function(handlerMethod){

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
			
	};
   

	var checkOfErrorType = function(err, errType){
		return errType.some(function(error){
						return (err instanceof error);
					});
	};

	if(err && checkOfErrorType(err, nativeErrors)){
		
		invokeMethod('onNativeException');
	
	}else if(err && checkOfErrorType(err, libraryErrors)){
		
		invokeMethod('onLibraryException');
	
	}else if(err && checkOfErrorType(err, networkErrors)){		
		
		invokeMethod('onNetworkException');
	
	}else{
		
		invokeMethod('onApplicationException');
	
	}
};


//////////////////////////////////////////////////////////////
//// TopNode: just there to stop handling propagation
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
	//DO NOTHING
};


//////////////////////////////////////////////////////////////
//// Node1: should retry for network exceptions... todo
//////////////////////////////////////////////////////////////
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
//// Node2: should log all exceptions
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
	this.logger.append('RemoteException: ' + this.ctxt.callError);
	Node2.super(this);
};

Node2.onNativeException = function(){
	this.logger.append('RemoteException: ' + this.ctxt.callError);
	this.logger.append(this.ctxt.callError.stack);
	Node2.super(this);
};

//////////////////////////////////////////////////////////////
//// Node3: GUI calls for ApplicationExceptions
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
//// Node4: BufferCalls (NetworkException)
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
//// LeafA: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

//GENERATED
var LeafA = function(){
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance();
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
//// Node5: set username, specific (ApplicationException)
//////////////////////////////////////////////////////////////


var Node5 = function(){
	console.log('Node5 created'); 
};
Node5.prototype = new HandlerNode();
Node5.prototype.constructor = Node5;
Node5.toString = function(){
	return 'Node5';
};
Node5.super = function(target){
	target.handleException(target, Node3);
};
Node5.onApplicationException = function(){
	console.log(' Node5 onApplicationException', this.ctxt);

	if(this.ctxt.callError instanceof UsernameNotAllowedError){
		var rpcArgs = this.ctxt.thunk.args;
		var name = rpcArgs[1][1];
		var rand = Math.floor((Math.random() * 100) + 1);
		var newName = name+rand;
		rpcArgs[1][1] =newName;
		
		var cb = this.ctxt.getOriginalCb();
		rpcArgs[2] = function (err, res){
			if(!err){
				$author.val(newName);
			}
			cb(err, res)
		}
		this.ctxt.retry();
	}else{
		Node5.super(this);
	}
};

Node5.onException = function(){
	console.log(' Node5 onException');
	Node5.super(this);
};

//////////////////////////////////////////////////////////////
//// LeafB: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

var LeafB = function(){
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance();
	//put here state from ALL its prototypes!
};
LeafB.super = function(target){
	target.handleException(target, Node5);
};
LeafB.prototype = new Node5();
LeafB.prototype.onException = function(){
	console.log('leaf B');
	LeafB.super(this);
};















if(typeof exports !== 'undefined'){
	global.makeFailureProxy = makeFailureProxy;
	global.LeafB = LeafB;
	global.LeafA = LeafA;
}
