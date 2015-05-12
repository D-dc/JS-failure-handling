
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
}
    
describe('test call object interface (multiple handlers)', function() {

	var fp = makeFailureProxy(stub);
	

	describe('Fields', function() {
	    

	    it('exception translation: should be able to pass along different result and exception', function(done) {
	    	stub.nextResult = new Error();

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onNetworkException = function () {
		    	expect(this.ctxt.callError).not.to.equal(stub.nextResult);
		    	expect(this.ctxt.callError).to.be.instanceof(NetworkError);
		    	expect(this.ctxt.callResult).to.equal(true);
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
		    	expect(this.ctxt.callError).to.eql(stub.nextResult);

		    	//change outcome here
		    	this.ctxt.callError = new NetworkError();
		    	this.ctxt.callResult = true;
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(err).not.to.equal(stub.nextResult);
		    	expect(err).to.be.instanceof(NetworkError);
		    	expect(res).to.equal(true);
	        	done();
	        });

	    });  
	});

	describe('Methods', function() {
		it('Method: succeed(), should immediately invoke continuation', function(done) {
			stub.nextResult = new Error();
			var value = 42;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		    	done(new Error('should not be invoked.'))
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
		    	this.ctxt.succeed(value);
		    	//TODO
		    	this.ctxt.finish();
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(err).to.be.undefined;
		    	expect(res).to.equal(value);
	        	done();
	        });

	    });


		it('Method: fail(), should immediately invoke continuation', function(done) {
			stub.nextResult = new Error();
			var value = 42;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		    	done(new Error('should not be invoked.'))
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
		    	this.ctxt.fail(value);
		    	//TODO
		    	this.ctxt.finish();
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(err).to.equal(value);
		    	expect(res).to.be.undefined;
	        	done();
	        });
	    });


		it('Method: continue()', function(done) {
	    	stub.nextResult = new Error();
	    	var value = 42;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		    	done(new Error('should not be invoked.'))
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
		    	this.ctxt.continue(value, value);
		    	//TODO
		    	this.ctxt.finish();
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(res).to.equal(value);
	        	expect(err).to.equal(value);
	        	done();
	        });
	    });


		it('Method: retry() (1x)', function(done) {
	    	stub.nextResult = new Error();

	    	var counter = 0;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		    	done(new Error('should not be invoked'));
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
		    	counter++;
		    	stub.nextResult = true;
		    	this.ctxt.retry();
		    	//TODO
		    	this.ctxt.finish();
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(counter).to.equal(1);
	        	expect(err).to.be.undefined;
	        	expect(res).to.be.true;
	        	done();
	        });
	    });

		
		it('Method: retry() (10x)', function(done) {
	    	stub.nextResult = new Error();

	    	var counter = 0;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		    	done(new Error('should not be invoked'));
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
		    	counter++;
		    	if(counter===10)
		    		stub.nextResult = true;
		    	
		    	this.ctxt.retry();
		    	this.ctxt.finish();
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(counter).to.equal(10);
	        	expect(err).to.be.undefined;
	        	expect(res).to.be.true;
	        	done();
	        });
	    });


		it('Method: alternateCall() (same callback)', function(done) {
	    	stub.nextResult = new Error();

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    
		    //B Logic
		    var B = function () {};
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.alternateCall(this.ctxt.callName, this.ctxt.callArgs());
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	expect(err).to.be.undefined;
	        	expect(res).to.be.true;
	        	done();
	        });
	    });


		it('Method: alternateCall() (other callback)', function(done) {
	    	stub.nextResult = new Error();

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    
		    //B Logic
		    var B = function () {};
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.alternateCall(this.ctxt.callName, this.ctxt.callArgs(), function(err, res){
		    		done();
		    	});
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;

		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	done(new Error('should not be called.'));
	        });
	    }); 


	    it('Method: hasFailureContinuation()', function(done) {
	    	stub.nextResult = new Error();

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.hasFailureContinuation();
		    	setTimeout(function(){
		    		done();
		    	}, 250);
		    };

		    //B Logic
		    var B = function () {};
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    A.onException = function () {
				stub.nextResult = true;
		    	this.ctxt.hasFailureContinuation();
		    	this.ctxt.finish();
		    	setTimeout(function(){
		    		done();
		    	}, 250);
		    };

		    //BLeaf state
		    var BLeaf = function () {};
		    BLeaf.super = function (target) {
		        target.handleException(B);
		    };
		    BLeaf.flagPriority = false;
		    BLeaf.prototype = new HandlerNode();
		    BLeaf.prototype.constructor = BLeaf;


		    var BProxy = fp(BLeaf);

	        BProxy.rpc('name', 1, 2, function(err, res) {
	        	done(new Error('should not be called.'));
	        });
	    });   	
	});    
});	