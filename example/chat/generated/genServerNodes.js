'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global HandlerNode*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/



require('./logSingleton.js');
require('../../../nodeHandling.js');



//////////////////////////////////////////////////////////////
//// SNode1: Log exceptions
//////////////////////////////////////////////////////////////
var SNode1 = function () {
	console.log('SNode1 created');
};
SNode1.flagPriority = false;
SNode1.prototype = new HandlerNode();
SNode1.prototype.constructor = SNode1;
SNode1.prototype.toString = function () {
	return ' -SNode1';
};

SNode1.onException = function () {
	var c = this.ctxt;
	this.logger.append('RPC CALL: ' + c.callName + ' ARGS ' + c.callArgs() + ' ERROR: ' + c.callError);
};

SNode1.onNativeException = function () {
	var c = this.ctxt;
	this.logger.append('RPC CALL: ' + c.callName + ' ARGS ' + c.callArgs() + ' ERROR: ' + c.callError);
	this.logger.append(c.callError.stack);
};



//////////////////////////////////////////////////////////////
//// SNode2: buffer and retry for NetworkException.
//////////////////////////////////////////////////////////////
var SNode2 = function () {
	console.log('SNode2 created');
};
SNode2.super = function (target) {
	target.handleException(SNode1);
};
SNode2.flagPriority = false;
SNode2.prototype = new HandlerNode();
SNode2.prototype.constructor = SNode2;
SNode2.prototype.toString = function () {
	return ' -SNode2';
};
SNode2.onNetworkException = function () {
	var self = this;

	//var stub = this.ctxt.thunk.target;
	// console.log('stub', stub)
	// stub.onConnection(function(){
	// 	self.ctxt.retry();
	// })
	// stub.once('connect', function () {
	// 	self.ctxt.retry();
	// });
};



//////////////////////////////////////////////////////////////
//// SNode3: try-once (NetworkException)
//////////////////////////////////////////////////////////////

var SNode3 = function () {
	console.log('SNode3 created');
};
SNode3.super = function (target) {
	target.handleException(SNode2);
};
SNode3.flagPriority = true;
SNode3.prototype = new HandlerNode();
SNode3.prototype.constructor = SNode3;
SNode3.prototype.toString = function () {
	return ' -SNode3';
};

SNode3.onNetworkException = function () {
	//we do not bother retrying. This handling is executed on non-important calls.
};


//////////////////////////////////////////////////////////////
//// SLeafA: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

//GENERATED
var SLeafA = function () {
	console.log('new leaf A');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance();
};
SLeafA.super = function (target) {
	target.handleException(SNode2);
};
SLeafA.prototype = new HandlerNode();
SLeafA.prototype.constructor = SLeafA;
SLeafA.prototype.toString = function () {
	return 'SLeafA';
};


//////////////////////////////////////////////////////////////
//// SLeafB: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

var SLeafB = function () {
	console.log('new leaf B');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance();
};
SLeafB.super = function (target) {
	target.handleException(SNode3);
};
SLeafB.prototype = new HandlerNode();
SLeafB.prototype.constructor = SLeafB;
SLeafB.prototype.toString = function () {
	return 'SLeafB';
};



global.SLeafB = SLeafB;
global.SLeafA = SLeafA;