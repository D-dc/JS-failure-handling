'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global HandlerNode*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


//////////////////////////////////////////////////////////////
//// CTopNode: just there to stop handling propagation.
//////////////////////////////////////////////////////////////

var CTopNode = function () {
	console.log('CTopNode created');
};
CTopNode.flagPriority = false;
CTopNode.prototype = new HandlerNode();
CTopNode.prototype.constructor = CTopNode;
CTopNode.prototype.toString = function () {
	return ' -CTopNode';
};

CTopNode.onException = function () {
	//DO NOTHING
};


//////////////////////////////////////////////////////////////
//// CNode1: should log all exceptions
//////////////////////////////////////////////////////////////
var CNode1 = function () {
	console.log('CNode1 created');
};
CNode1.super = function (target) {
	target.handleException(CTopNode);
};
CNode1.flagPriority = false;
CNode1.prototype = new HandlerNode();
CNode1.prototype.constructor = CNode1;
CNode1.prototype.toString = function () {
	return ' -CNode1';
};

CNode1.onException = function () {
	var c = this.ctxt;
	this.logger.append('RPC CALL: ' + c.callName + ' ARGS: ' + c.callArgs() + ' ERROR: ' + c.callError);
};

CNode1.onNativeException = function () {
	var c = this.ctxt;
	this.logger.append('RPC CALL: ' + c.callName + ' ARGS ' + c.callArgs() + ' ERROR: ' + c.callError);
	this.logger.append(c.callError.stack);
};


//////////////////////////////////////////////////////////////
//// CNode2: should buffer for network exceptions...
//////////////////////////////////////////////////////////////
var CNode2 = function () {
	console.log('CNode2 created');
};
CNode2.super = function (target) {
	target.handleException(CNode1);
};
CNode2.flagPriority = false;
CNode2.prototype = new HandlerNode();
CNode2.prototype.constructor = CNode2;
CNode2.prototype.toString = function () {
	return ' -CNode2';
};


CNode2.onNetworkException = function () {
	var buffer = this.buffer;

	buffer.bufferCall(this.ctxt);
};


//////////////////////////////////////////////////////////////
//// CNode3: GUI calls for ApplicationExceptions
//////////////////////////////////////////////////////////////
var CNode3 = function () {
	console.log('CNode3 created');
};
CNode3.super = function (target) {
	target.handleException(CNode2);
};
CNode3.flagPriority = false;
CNode3.prototype = new HandlerNode();
CNode3.prototype.constructor = CNode3;
CNode3.prototype.toString = function () {
	return ' -CNode3';
};

CNode3.onApplicationException = function () {
	var error = this.ctxt.callError;
	displayGUIAlert(error.message);
};


//////////////////////////////////////////////////////////////
//// CNode4: BufferCalls (NetworkException)
//////////////////////////////////////////////////////////////

// var CNode4 = function () {
// 	console.log('CNode4 created');
// };
// CNode4.super = function (target) {
// 	target.handleException(CNode3);
// };
// CNode4.flagPriority = true;
// CNode4.prototype = new HandlerNode();
// CNode4.prototype.constructor = CNode4;
// CNode4.prototype.toString = function () {
// 	return ' -CNode4';
// };

// CNode4.onNetworkException = function () {
// 	var self = this;
// 	var stub = this.ctxt.thunk.target;

// 	stub.onceConnected(function () {
// 		console.log('retrying now');
// 		self.ctxt.retry();
// 	});
// };



//////////////////////////////////////////////////////////////
//// CNode5: set username, specific (ApplicationException)
//////////////////////////////////////////////////////////////


var CNode5 = function () {
	console.log('CNode5 created');
};
CNode5.super = function (target) {
	target.handleException(CNode3);
};
CNode5.flagPriority = false;
CNode5.prototype = new HandlerNode();
CNode5.prototype.constructor = CNode5;
CNode5.prototype.toString = function () {
	return ' -CNode5';
};

CNode5.onApplicationException = function () {
	if (this.IsException(UsernameNotAllowedError)) {

		var originalArgs = this.ctxt.callArgs();
		var newName;
		var name = originalArgs[1];
		if (name === 'test') { //for debug
			newName = 'test0';
		} else {
			var rand = Math.floor((Math.random() * 100) + 1);
			newName = name + rand;
		}

		originalArgs[1] = newName;
		this.ctxt.alternateCall(this.ctxt.callName, originalArgs);
	}
};


//////////////////////////////////////////////////////////////
//// CLeafA: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

//GENERATED
var CLeafA = function () {
	console.log('new leaf A');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance(); //! from CNode2
	this.buffer = UniqueBuffer.getInstance(); //! from CNode1
	//put here state from ALL its prototypes!
};
CLeafA.super = function (target) {
	target.handleException(CNode3);
};
CLeafA.prototype = new HandlerNode();
CLeafA.prototype.constructor = CLeafA;
CLeafA.prototype.toString = function () {
	return ' -CLeafA';
};


//////////////////////////////////////////////////////////////
//// CLeafB: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

var CLeafB = function () {
	console.log('new leaf B');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance(); //! from CNode2
	this.buffer = UniqueBuffer.getInstance(); //! from CNode1
	//put here state from ALL its prototypes!
};
CLeafB.super = function (target) {
	target.handleException(CNode5);
};
CLeafB.prototype = new HandlerNode();
CLeafB.prototype.constructor = CLeafB;
CLeafB.prototype.toString = function () {
	return ' -CLeafB';
};

//////////////////////////////////