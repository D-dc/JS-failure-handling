
var assert = require("assert"),
    expect = require('chai').expect,
    ServerRpc = require('../../RPCT/index.js');

require('../nodeHandling.js');

var stub = {
	nextResult: true,
	rpc: function(name, arg1, arg2, continuation){
		var self = this;

		var retryFunc = function(){
			return self.rpc(name, arg1, arg2, continuation)
		};

		var nextResult = this.nextResult;
		if(typeof nextResult === "boolean" && nextResult){
			continuation(undefined, nextResult, retryFunc);
		}else{
			continuation(nextResult, undefined, retryFunc);
		}
		
	}
}
    
describe('test call object interface', function() {

	var fp = makeFailureProxy(stub);
	

	describe('Fields', function() {
	    

	    it('Field: Args & callName', function(done) {
	    	stub.nextResult = new Error();

	    	var callName = 'name',
	    		arg1 = 1, arg2 = 2;

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	expect(this.ctxt.callName).to.equal(callName);
		    	expect(this.ctxt.callArgs()).to.eql([arg1, arg2]);
		        done();
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc(callName, arg1, arg2, function(err, res) {});
	    });


	    it('Field: Error', function(done) {
	    	stub.nextResult = new Error();

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	expect(this.ctxt.callError).to.eql(stub.nextResult);
		        done();
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {});
	    });


	    it('Field: Result', function(done) {
	    	stub.nextResult = new Error();

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	expect(this.ctxt.callResult).to.equal(undefined);
		        done();
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {});
	    });

	});

	
	describe('Methods', function() {
		it('Method: succeed()', function(done) {
	    	stub.nextResult = new Error();

	    	var value = 42;

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	this.ctxt.succeed(value);
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	expect(res).to.equal(value);
	        	expect(err).to.be.undefined;
	        	done();
	        });
	    });


		it('Method: fail()', function(done) {
	    	stub.nextResult = new Error();

	    	var value = 42;

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	this.ctxt.fail(value);
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	expect(res).to.be.undefined;
	        	expect(err).to.equal(value);
	        	done();
	        });
	    });


	    it('Method: continue()', function(done) {
	    	stub.nextResult = new Error();

	    	var value = 42;

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	this.ctxt.continue(value, value);
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	expect(res).to.equal(value);
	        	expect(err).to.equal(value);
	        	done();
	        });
	    });


	    it('Method: retry() (1x)', function(done) {
	    	stub.nextResult = new Error();

	    	var counter = 0;

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	counter++;
		    	stub.nextResult = true;
		    	this.ctxt.retry();
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	expect(counter).to.equal(1);
	        	expect(err).to.be.undefined;
	        	expect(res).to.be.true;
	        	done();
	        });
	    });


	    it('Method: retry() (10x)', function(done) {
	    	stub.nextResult = new Error();

	    	var counter = 0;

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	counter++;
		    	if(counter===10)
		    		stub.nextResult = true;
		    	this.ctxt.retry();
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	expect(counter).to.equal(10);
	        	expect(err).to.be.undefined;
	        	expect(res).to.be.true;
	        	done();
	        });
	    });


	    it('Method: alternateCall() (same callback)', function(done) {
	    	stub.nextResult = new Error();

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.alternateCall(this.ctxt.callName, this.ctxt.callArgs());
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	expect(err).to.be.undefined;
	        	expect(res).to.be.true;
	        	done();
	        });
	    });


	    it('Method: alternateCall() (other callback)', function(done) {
	    	stub.nextResult = new Error();

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.alternateCall(this.ctxt.callName, this.ctxt.callArgs(), function(err, res){
		    		done();
		    	});
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	done(new Error('should not be called.'));
	        });
	    });


	    it('Method: hasFailureContinuation()', function(done) {
	    	stub.nextResult = new Error();

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.hasFailureContinuation();
		    	setTimeout(function(){
		    		done();
		    	}, 250);
		    };

		    //A1Leaf state
		    var A1Leaf = function () {};
		    A1Leaf.super = function (target) {
		        target.handleException(A1);
		    };
		    A1Leaf.flagPriority = false;
		    A1Leaf.prototype = new HandlerNode();
		    A1Leaf.prototype.constructor = A1Leaf;

		    var A1Proxy = fp(A1Leaf);

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	        	done(new Error('should not be called.'));
	        });
	    });


	    it('Method: finish()', function(done) {
	    	stub.nextResult = new Error();

	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		    	done(new Error('should not be called.'));
		    };

		    //B2 Logic
		    var B2 = function () {
		    };
		    B2.super = function (target) {
		        target.handleException(A1);
		    };
		    B2.flagPriority = false;
		    B2.prototype = new HandlerNode();
		    B2.prototype.constructor = B2;
		    B2.onException = function () {
		    	this.ctxt.finish();
		    };

		    //B2Leaf state
		    var B2Leaf = function () {
		    };
		    B2Leaf.super = function (target) {
		        target.handleException(B2);
		    };
		    B2Leaf.flagPriority = false;
		    B2Leaf.prototype = new HandlerNode();
		    B2Leaf.prototype.constructor = B2Leaf;

		    var B2Proxy = fp(B2Leaf);

	        B2Proxy.rpc('name', 1, 2, function(err, res) {
	        	done();
	        });
	    });
	});
});	



    
