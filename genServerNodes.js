'use strict';


/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/




require('./logSingleton.js');
require('./nodeHandling.js');


//////////////////////////////////////////////////////////////
//// STopNode: just there to stop handling propagation.
//////////////////////////////////////////////////////////////

var STopNode = function(){
	console.log('STopNode created');
};
STopNode.prototype = new HandlerNode();
STopNode.prototype.constructor = STopNode;
STopNode.prototype.toString = function(){
	return ' -STopNode';
};

STopNode.onException = function(){
	//DO NOTHING
};


//////////////////////////////////////////////////////////////
//// SNode1: should log all exceptions
//////////////////////////////////////////////////////////////
var SNode1 = function(){
	console.log('SNode1 created');
};
SNode1.super = function(target){
	target.handleException(STopNode);
};
SNode1.prototype =  new HandlerNode();
SNode1.prototype.constructor = SNode1;
SNode1.prototype.toString = function(){
	return ' -SNode1';
};


SNode1.onException = function(){


	this.logger.append('RemoteException: ' + this.ctxt.callError);
	SNode1.super(this);
};

SNode1.onNativeException = function(){
	this.logger.append('RemoteException: ' + this.ctxt.callError);
	this.logger.append(this.ctxt.callError.stack);
	SNode1.super(this);
};




//////////////////////////////////////////////////////////////
//// SNode2: React to Msg blocked error
//////////////////////////////////////////////////////////////
var SNode2 = function(){
	console.log('SNode2 created');
};
SNode2.super = function(target){
	target.handleException(SNode1);
};
SNode2.prototype =  new HandlerNode();
SNode2.prototype.constructor = SNode2;
SNode2.prototype.toString = function(){
	return ' -SNode2';
};

SNode2.onApplicationException = function(){
	this.ctxt.invokeCb('aaa', 'aaa')
	this.ctxt.invokeCb('aaa', 'aaa')
	if(this.ctxt.callError instanceof MessageBlockedError){

	}
	SNode2.super(this);
};


//////////////////////////////////////////////////////////////
//// SNode3: BufferCalls (NetworkException)
//////////////////////////////////////////////////////////////

var SNode3 = function(){
	console.log('SNode3 created');
};
SNode3.super = function(target){
	target.handleException(SNode2);
};
SNode3.prototype =  new HandlerNode();
SNode3.prototype.constructor = SNode3;
SNode3.prototype.toString = function(){
	return ' -SNode3';
};

SNode3.onNetworkException = function(){
	var self = this;

	var stub = this.ctxt.thunk.target;
	stub.once('connect', function (){
		self.ctxt.retry();
	});
	//todo remove retry if callback gets executed anyway

	SNode3.super(this);
};


//////////////////////////////////////////////////////////////
//// SNode4: try-once (NetworkException)
//////////////////////////////////////////////////////////////

var SNode4 = function(){
	console.log('SNode4 created');
};
SNode4.super = function(target){
	target.handleException(SNode2);
};
SNode4.prototype =  new HandlerNode();
SNode4.prototype.constructor = SNode4;
SNode4.prototype.toString = function(){
	return ' -SNode4';
};

SNode4.onNetworkException = function(){

	SNode4.super(this);
};


//////////////////////////////////////////////////////////////
//// SLeafA: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

//GENERATED
var SLeafA = function(){
	console.log('new leaf A');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance();
};
SLeafA.super = function(target){
	target.handleException(SNode3);
};
SLeafA.prototype =  new HandlerNode();
SLeafA.prototype.constructor = SLeafA;
SLeafA.prototype.toString = function(){
	return 'SLeafA';
};


//////////////////////////////////////////////////////////////
//// SLeafB: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

var SLeafB = function(){
	console.log('new leaf B');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance();
};
SLeafB.super = function(target){
	target.handleException(SNode4);
};
SLeafB.prototype =  new HandlerNode();
SLeafB.prototype.constructor = SLeafB;
SLeafB.prototype.toString = function(){
	return 'SLeafB';
};










global.SLeafB = SLeafB;
global.SLeafA = SLeafA;

