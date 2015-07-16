'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global HandlerNode*/


require('../../../lib/logSingleton.js');



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
SNode2.parent = SNode1;
SNode2.flagPriority = false;
SNode2.toString = function () {
    return ' -SNode2';
};
// SNode2.onNetworkException = function () {
//  var buffer = this.buffer;
//  buffer.bufferCall(this.ctxt);
// };



//////////////////////////////////////////////////////////////
//// SNode3: try-once (NetworkException)
//////////////////////////////////////////////////////////////

var SNode3 = function () {
    console.log('SNode3 created');
};
SNode3.parent = SNode2;
SNode3.flagPriority = true;
SNode3.toString = function () {
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
    this.buffer = UniqueBuffer.getInstance();
};
SLeafA.parent = SNode2;
SLeafA.prototype = new HandlerNode();
SLeafA.prototype.constructor = SLeafA;
SLeafA.toString = function () {
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
    this.buffer = UniqueBuffer.getInstance();
};
SLeafB.parent = SNode3;
SLeafB.prototype = new HandlerNode();
SLeafB.prototype.constructor = SLeafB;
SLeafB.toString = function () {
    return 'SLeafB';
};



global.SLeafB = SLeafB;
global.SLeafA = SLeafA;