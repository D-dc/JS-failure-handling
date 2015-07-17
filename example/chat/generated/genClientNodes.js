'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global HandlerNode*/



//////////////////////////////////////////////////////////////
//// CNode1: should log all exceptions
//////////////////////////////////////////////////////////////
var CNode1 = function () {
    console.log('CNode1 created');
};

CNode1.flagPriority = false;
CNode1.toString = function () {
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
CNode2.parent = CNode1;
CNode2.flagPriority = false;
CNode2.toString = function () {
    return ' -CNode2';
};


CNode2.onNetworkException = function () {
    var buffer = this.buffer,
        due = this.due;

    buffer.bufferCall(this.ctxt, due);
};


//////////////////////////////////////////////////////////////
//// CNode3: GUI calls for ApplicationExceptions
//////////////////////////////////////////////////////////////
var CNode3 = function () {
    console.log('CNode3 created');
};
CNode3.parent = CNode2;
CNode3.flagPriority = false;
CNode3.toString = function () {
    return ' -CNode3';
};

CNode3.onApplicationException = function () {
    var error = this.ctxt.callError;
    $('#alert').html(error.message);
    $('#alert').css('display', 'block');
};


//////////////////////////////////////////////////////////////
//// CNode4: BufferCalls (NetworkException)
//////////////////////////////////////////////////////////////

// var CNode4 = function () {
//  console.log('CNode4 created');
// };
// CNode4.super = function (target) {
//  target.handleException(CNode3);
// };
// CNode4.flagPriority = true;
// CNode4.prototype = new HandlerNode();
// CNode4.prototype.constructor = CNode4;
// CNode4.prototype.toString = function () {
//  return ' -CNode4';
// };

// CNode4.onNetworkException = function () {
//  var self = this;
//  var stub = this.ctxt.thunk.target;

//  stub.onceConnected(function () {
//      console.log('retrying now');
//      self.ctxt.retry();
//  });
// };



//////////////////////////////////////////////////////////////
//// CNode5: set username, specific (ApplicationException)
//////////////////////////////////////////////////////////////


var CNode5 = function () {
    console.log('CNode5 created');
};
CNode5.parent = CNode3;
CNode5.flagPriority = false;
CNode5.toString = function () {
    return ' -CNode5';
};

CNode5.onApplicationException = function () {
    if (this.ctxt.isCallErrorType(UsernameNotAllowedError)) {

        var originalArgs = this.ctxt.callArgs();
        console.log('callArgs', originalArgs)
        var newName;
        var name = originalArgs[1];
        if (name === 'test') { //for debug
            originalArgs[1] = 'test0';
        } else {
            var rand = Math.floor((Math.random() * 100) + 1);
            originalArgs[1] = name + rand;
        }

        this.ctxt.alternativeCall(this.ctxt.callName, originalArgs);
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

    this.due = 60000;
    this.times = 5;
};
CLeafA.parent = CNode3;
CLeafA.prototype = new HandlerNode();
CLeafA.prototype.constructor = CLeafA;
CLeafA.toString = function () {
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

    this.due = 60000;
    this.times = 5;
};
CLeafB.parent = CNode5;
CLeafB.prototype = new HandlerNode();
CLeafB.prototype.constructor = CLeafB;
CLeafB.toString = function () {
    return ' -CLeafB';
};

//////////////////////////////////