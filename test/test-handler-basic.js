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
			A.onException = function () {
				done(new Error('should not invoke onException method.'));
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
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
			A.onException = function () {
				invoked = true;
				this.ctxt.proceed();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
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
			A.onException = function () {
				invoked = true;
				this.ctxt.proceed();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
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
			A.onNetworkException = function () {
				this.ctxt.proceed();

				expect(this.ctxt.callError).to.equal(stub.nextResult);
				expect(this.ctxt.callResult).to.be.undefined;
				done();
			};
			A.onException = function () {
				done(new Error('should not invoke method.'));
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('should not invoke continuation.'));
			});
		});


		it('should invoke onException method (if more specific method is absent)', function (done) {
			stub.nextResult = "custom error";
			var invoked = false;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				invoked = true;
				this.ctxt.proceed();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
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
			stub.nextResult = "custom error";

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onNativeException = function () {
				done(new Error('should not invoke'));
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
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


		it('should invoke callback if no handling method present (application exception).', function (done) {
			stub.nextResult = "custom error";

			//A Logic
			var A = function () {};
			A.flagPriority = false;

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
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


		it('should note invoke callback on Network exception.', function (done) {
			stub.nextResult = new NetworkError();

			//A Logic
			var A = function () {};
			A.flagPriority = false;

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('Should not invoke callback'));
			});

			setTimeout(function(){
				done();
			}, 1000)
		});


		it('should note invoke callback on Native error.', function (done) {
			stub.nextResult = new SyntaxError();

			//A Logic
			var A = function () {};
			A.flagPriority = false;

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('Should not invoke callback'));
			});

			setTimeout(function(){
				done();
			}, 1000)
		});


		it('should invoke callback on JS Error.', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				done();
			});
		});
	});
});