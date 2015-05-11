
var assert = require("assert"),
    expect = require('chai').expect,
    ServerRpc = require('../../RPCT/index.js');

require('../nodeHandling.js');

var stub = {
	nextResult: true,
	rpc: function(name, arg1, arg2, continuation){
		console.log('Called ', name);

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
	

	describe('test return types', function() {
	    

	    it('No handling when normal return', function(done) {
	    	stub.nextResult = true;
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
		        done(new Error('should not invoke onException method.'));
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
	            expect(err).to.equal(undefined);
	            expect(res).to.be.true;
	            done();
	        });
	    });

	    
	    it('Handling when exceptional return', function(done) {
	    	stub.nextResult = new Error();
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
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

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	        });
	    });
	});


	describe('test handler methods', function() {
	    

	    it('should invoke onException method', function(done) {
	    	stub.nextResult = new Error();
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
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

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	        });
	    });


	    it('should not invoke onException method', function(done) {
	    	stub.nextResult = new NetworkError();
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onNetworkException = function () {
		        done();
		    };
		    A1.onException = function () {
		        done(new Error('should not invoke method.'));
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
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	        });
	    });


	    it('should invoke onException method (if more specific method is absent)', function(done) {
	    	stub.nextResult = new NetworkError();
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onException = function () {
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

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	        });
	    });


	    it('should invoke callback if no handling method present (Other specific).', function(done) {
	    	stub.nextResult = new NetworkError();
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;
		    A1.onNativeException = function () {
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

	        A1Proxy.rpc('name', 1, 2, function(err, res) {
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	            done();
	        });
	    });


	    it('should invoke callback if no handling method present.', function(done) {
	    	stub.nextResult = new NetworkError();
	    	//A1 Logic
	    	var A1 = function () {};
		    A1.flagPriority = false;
		    A1.prototype = new HandlerNode();
		    A1.prototype.constructor = A1;

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
	            expect(err).to.equal(stub.nextResult);
	            expect(res).to.be.undefined;
	            done();
	        });
	    });
	});
});	