var assert = require("assert"),
	expect = require('chai').expect,
	ServerRpc = require('../../RPCT/index.js');

require('../lib/nodeHandling.js');

var stub = {
	nextResult: true,
	rpc: function (name, arg1, arg2, continuation) {

		var nextResult = this.nextResult;
		if (typeof nextResult === "boolean" && nextResult) {
			continuation(undefined, nextResult);
		} else {
			continuation(nextResult);
		}

	}
}

describe('tests', function () {

	var fp = makeFailureProxy(stub);

	describe('test return types', function () {


		it('should not do handling when normal return', function (done) {
			stub.nextResult = true;
			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;
			A.onException = function () {
				done(new Error('should not invoke onException method.'));
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(undefined);
				expect(res).to.be.true;
				done();
			});
		});


		it('should do handling when exceptional return', function (done) {
			stub.nextResult = new Error();
			var invoked = false;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;
			A.onException = function () {
				invoked = true;
				this.ctxt.proceed();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(stub.nextResult);
				expect(res).to.be.undefined;

				if (invoked) done();
			});
		});
	});


	describe('test handler methods', function () {


		it('should invoke onException method', function (done) {
			stub.nextResult = new Error();
			var invoked = false;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;
			A.onException = function () {
				invoked = true;
				this.ctxt.proceed();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(stub.nextResult);
				expect(res).to.be.undefined;

				if (invoked) done();
			});
		});


		it('should invoke specific method', function (done) {
			stub.nextResult = new NetworkError();
			var invoked = false;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;
			A.onNetworkException = function () {
				invoked = true;
				this.ctxt.proceed();
			};
			A.onException = function () {
				done(new Error('should not invoke method.'));
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(stub.nextResult);
				expect(res).to.be.undefined;

				if (invoked) done();
			});
		});


		it('should invoke onException method (if more specific method is absent)', function (done) {
			stub.nextResult = new NetworkError();
			var invoked = false;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;
			A.onException = function () {
				invoked = true;
				this.ctxt.proceed();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(stub.nextResult);
				expect(res).to.be.undefined;
				if (invoked) done();
			});
		});


		it('should invoke callback if no handling method present (Other specific).', function (done) {
			stub.nextResult = new NetworkError();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;
			A.onNativeException = function () {
				done(new Error('should not invoke'));
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(stub.nextResult);
				expect(res).to.be.undefined;

				done();
			});
		});


		it('should invoke callback if no handling method present.', function (done) {
			stub.nextResult = new NetworkError();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.prototype = new HandlerNode();
			A.prototype.constructor = A;

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.super = function (target) {
				target.handleException(A);
			};
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(stub.nextResult);
				expect(res).to.be.undefined;

				done();
			});
		});
	});
});