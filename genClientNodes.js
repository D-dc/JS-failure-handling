'use strict';


/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


//////////////////////////////////////////////////////////////
//// CTopNode: just there to stop handling propagation.
//////////////////////////////////////////////////////////////

var CTopNode = function(){
	console.log('CTopNode created');
};
CTopNode.prototype = new HandlerNode();
CTopNode.prototype.constructor = CTopNode;
CTopNode.prototype.toString = function(){
	return ' -CTopNode';
};

CTopNode.onException = function(){
	//DO NOTHING
};


//////////////////////////////////////////////////////////////
//// CNode1: should retry for network exceptions... todo
//////////////////////////////////////////////////////////////
var CNode1 = function(){
	console.log('CNode1 created');
};
CNode1.super = function(target){
	target.handleException(CTopNode);
};
CNode1.prototype =  new HandlerNode();
CNode1.prototype.constructor = CNode1;
CNode1.prototype.toString = function(){
	return ' -CNode1';
};


CNode1.onNetworkException = function(){
	var self = this;

	if(!this.ctr) this.ctr=0;
		this.ctr++;
		console.log('retrying ', this.ctr);
		
		
		if(this.ctr >= 3){
			CNode1.super(this);
			this.ctr=0;
			//debugger
		} else {
			
			setTimeout(function (){
				self.ctxt.retry();
			}, 2000);
		}

};

CNode1.onException = function(){
	CNode1.super(this);
};




//////////////////////////////////////////////////////////////
//// CNode2: should log all exceptions
//////////////////////////////////////////////////////////////
var CNode2 = function(){
	console.log('CNode2 created');
};
CNode2.super = function(target){
	target.handleException(CNode1);
};
CNode2.prototype =  new HandlerNode();
CNode2.prototype.constructor = CNode2;
CNode2.prototype.toString = function(){
	return ' -CNode2';
};

CNode2.onException = function(){

	this.logger.append('RemoteException: ' + this.ctxt.callError);
	CNode2.super(this);
};

CNode2.onNativeException = function(){
	this.logger.append('RemoteException: ' + this.ctxt.callError);
	this.logger.append(this.ctxt.callError.stack);
	CNode2.super(this);
};

//////////////////////////////////////////////////////////////
//// CNode3: GUI calls for ApplicationExceptions
//////////////////////////////////////////////////////////////
var CNode3 = function(){
	console.log('CNode3 created');
};
CNode3.super = function(target){
	target.handleException(CNode2);
};
CNode3.prototype =  new HandlerNode();
CNode3.prototype.constructor = CNode3;
CNode3.prototype.toString = function(){
	return ' -CNode3';
};

CNode3.onApplicationException = function(){
	var error = this.ctxt.callError;
	displayGUIAlert(error.message);
	CNode3.super(this);
};
// CNode3.onException = function(){
// 	console.log('leaf A');
// 	CNode3.super(this);
// };


//////////////////////////////////////////////////////////////
//// CNode4: BufferCalls (NetworkException)
//////////////////////////////////////////////////////////////

var CNode4 = function(){
	console.log('CNode4 created');
};
CNode4.super = function(target){
	target.handleException(CNode3);
};
CNode4.prototype =  new HandlerNode();
CNode4.prototype.constructor = CNode4;
CNode4.prototype.toString = function(){
	return ' -CNode4';
};

CNode4.onNetworkException = function(){
	var self = this;
	// var stub = this.ctxt.thunk.target;
	// stub.once('connect', function (){
	// 	self.ctxt.retry();
	// });
	//todo remove retry if callback gets executed anyway

	CNode4.super(this);
};





//////////////////////////////////////////////////////////////
//// CNode5: set username, specific (ApplicationException)
//////////////////////////////////////////////////////////////


var CNode5 = function(){
	console.log('CNode5 created'); 
};
CNode5.super = function(target){
	target.handleException(CNode3);
};
CNode5.prototype =  new HandlerNode();
CNode5.prototype.constructor = CNode5;
CNode5.prototype.toString = function(){
	return ' -CNode5';
};

CNode5.onApplicationException = function(){

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
		CNode5.super(this);
	}
};

// CNode5.onException = function(){
// 	console.log(' CNode5 onException');
// 	CNode5.super(this);
// };

//////////////////////////////////////////////////////////////
//// CLeafA: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

//GENERATED
var CLeafA = function(){
	console.log('new leaf A');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance(); //! from CNode2
	//put here state from ALL its prototypes!
};
CLeafA.super = function(target){
	target.handleException(CNode4);
};
CLeafA.prototype =  new HandlerNode();
CLeafA.prototype.constructor = CLeafA;
CLeafA.prototype.toString = function(){
	return ' -CLeafA';
};


//////////////////////////////////////////////////////////////
//// CLeafB: A particular leaf, generated at run time for each
////        specific call, contains the state.
//////////////////////////////////////////////////////////////

var CLeafB = function(){
	console.log('new leaf B');
	this.ctxt = null;
	this.logger = UniqueLogger.getInstance(); //! from CNode2
	//put here state from ALL its prototypes!
};
CLeafB.super = function(target){
	target.handleException(CNode5);
};
CLeafB.prototype =  new HandlerNode();
CLeafB.prototype.constructor = CLeafB;
CLeafB.prototype.toString = function(){
	return ' -CLeafB';
};

