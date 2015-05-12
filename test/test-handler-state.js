
var assert = require("assert"),
    expect = require('chai').expect,
    ServerRpc = require('../../RPCT/index.js');

require('../nodeHandling.js');

var stub = {
	nextResult: true,
	rpc: function(name, arg1, arg2, continuation){
		var self = this;

		var invokeCont = function(){
			var nextResult = self.nextResult;
			if(typeof nextResult === "boolean" && nextResult){
				continuation(undefined, nextResult, retryFunc);
			}else{
				continuation(nextResult, undefined, retryFunc);
			}
		}

		var retryFunc = function(){
			invokeCont();
		};

		invokeCont();
		
	}
};


var State = function(){
	console.log('NEW STATE')
	this.counter = 0;
};

State.prototype.increment = function(){
	this.counter++;
	return this;
};

State.prototype.value = function(){
	return this.counter;
};

State.prototype.reset = function(){
	this.counter = 0;
};
    
describe('test-handler-state', function() {

	var fp = makeFailureProxy(stub);
	

	describe('', function() {
	    

	    it('Multiple invocations of same handlers should have own state', function(done) {
	    	stub.nextResult = new Error();

	    	var counter = 0;

	    	var CheckState = function () {};
		    CheckState.flagPriority = false;
		    CheckState.prototype = new HandlerNode();
		    CheckState.prototype.constructor = CheckState;
		    CheckState.onException = function () {
		    	counter++;

		    	expect(this.AState.value()).to.equal(1);
		    	expect(this.BState.value()).to.equal(1);

		    	if(counter == 2) done();
		    };

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.super = function (target) {
		        target.handleException(CheckState);
		    };
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		    	this.AState.increment();
		    };

		    //B Logic
		    var B = function () {};
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
		    	this.BState.increment();
		    };

		    //BLeaf state
		    var BLeaf = function () {
		    	this.AState = new State();
		    	this.BState = new State();
		    };
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {});
	        BProxy.rpc('name', 1, 2, function(err, res) {});

	    });  


		it('Retry should maintain state', function(done) {
	    	stub.nextResult = new SyntaxError();

	    	var counter = 0;

	    	var CheckState = function () {};
		    CheckState.flagPriority = false;
		    CheckState.prototype = new HandlerNode();
		    CheckState.prototype.constructor = CheckState;
		    CheckState.onNetworkException = function () {
		    	counter++;

		    	expect(this.BState.value()).to.equal(2);

		    	if(counter === 2) done();
		    };

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.super = function (target) {
		        target.handleException(CheckState);
		    };
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onNativeException = function () {
		    	stub.nextResult = new NetworkError();
		    	this.ctxt.retry();
		    	this.ctxt.finish();
		    };

		    //B Logic
		    var B = function () {};
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
		    	this.BState.increment();
		    };

		    //BLeaf state
		    var BLeaf = function () {
		    	this.BState = new State();
		    };
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);
	        BProxy.rpc('name', 1, 2, function(err, res) {});
	        stub.nextResult = new SyntaxError();
	        BProxy.rpc('name', 1, 2, function(err, res) {});

	    });  

		
		it('Alternate call should maintain state', function(done) {
	    	stub.nextResult = new SyntaxError();

	    	var counter = 0;

	    	var CheckState = function () {};
		    CheckState.flagPriority = false;
		    CheckState.prototype = new HandlerNode();
		    CheckState.prototype.constructor = CheckState;
		    CheckState.onNetworkException = function () {
		    	counter++;

		    	expect(this.BState.value()).to.equal(2);

		    	if(counter === 2) done();
		    };

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.super = function (target) {
		        target.handleException(CheckState);
		    };
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onNativeException = function () {
		    	stub.nextResult = new NetworkError();
		    	this.ctxt.alternateCall();
		    	this.ctxt.finish();
		    };

		    //B Logic
		    var B = function () {};
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
		    	this.BState.increment();
		    };

		    //BLeaf state
		    var BLeaf = function () {
		    	this.BState = new State();
		    };
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);
	        BProxy.rpc('name', 1, 2, function(err, res) {});
	        stub.nextResult = new SyntaxError();
	        BProxy.rpc('name', 1, 2, function(err, res) {});

	    });  
	});    
});	