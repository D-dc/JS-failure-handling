
var assert = require("assert"),
    expect = require('chai').expect,
    ServerRpc = require('../../RPCT/index.js');

require('../nodeHandling.js');

var stub = {
	nextResult: true,
	rpc: function(name, arg1, arg2, continuation){

		var nextResult = this.nextResult;
		if(typeof nextResult === "boolean" && nextResult){
			continuation(undefined, nextResult);
		}else{
			continuation(nextResult);
		}
		
	}
}
    
describe('tests', function() {

	var fp = makeFailureProxy(stub);
	

	describe('test handler methods (2 handlers)', function() {
	    

	    it('should invoke onException method', function(done) {
	    	stub.nextResult = new Error();
	    	
	    	counter = 0;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		       	counter++;
		    };

		    //B Logic
		    var B = function () {
		    };
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
		    	counter++;
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
	        	expect(counter).to.equal(2);
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	            done();
	        });
	    });


	    it('should invoke specific method', function(done) {
	    	stub.nextResult = new NetworkError();

	    	counter = 0;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onNetworkException = function () {
		        counter++;
		    };
		    A.onException = function () {
		        done(new Error('should not invoke method.'));
		    };

		    //B Logic
		    var B = function () {
		    };
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onNetworkException = function () {
		    	counter++;
		    };
		    B.onException = function () {
		        done(new Error('should not invoke method.'));
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
	        	expect(counter).to.equal(2);
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	            done();
	        });
	    });


	    it('should invoke specific method', function(done) {
	    	stub.nextResult = new NetworkError();

	    	counter = 0;

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onNetworkException = function () {
		        counter++;
		    };
		    A.onException = function () {
		        done(new Error('should not invoke method.'));
		    };

		    //B Logic
		    var B = function () {
		    };
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;
		    B.onException = function () {
		    	counter++;
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
	        	expect(counter).to.equal(2);
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	            done();
	        });
	    });


	    it('should skip handler if no handling method present', function(done) {
	    	stub.nextResult = new NetworkError();

	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;
		    A.onException = function () {
		        done();
		    };

		    //B Logic
		    var B = function () {
		    };
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;

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

	        });
	    });


	    it('should invoke callback if no handling method present.', function(done) {
	    	stub.nextResult = new Error();
	    	//A Logic
	    	var A = function () {};
		    A.flagPriority = false;
		    A.prototype = new HandlerNode();
		    A.prototype.constructor = A;

		    //B Logic
		    var B = function () {
		    };
		    B.super = function (target) {
		        target.handleException(A);
		    };
		    B.flagPriority = false;
		    B.prototype = new HandlerNode();
		    B.prototype.constructor = B;

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
	        	expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	        	done();
	        });
	    });
	});
});	