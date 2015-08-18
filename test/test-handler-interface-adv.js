var assert = require("assert"),
	expect = require('chai').expect,
	ServerRpc = require('../../RPCT/index.js');

require('../lib/nodeHandling.js');

var stub = {
	nextResult: true,
	rpc: function (name, arg1, arg2, continuation) {
		var self = this;

		var invokeCont = function () {
			var nextResult = self.nextResult;
			if (typeof nextResult === "boolean" && nextResult) {
				continuation(undefined, nextResult, retryFunc);
			} else {
				continuation(nextResult, undefined, retryFunc);
			}
		}

		var retryFunc = function () {
			invokeCont();
		};

		invokeCont();

	}
}

describe('Test call object interface (multiple handlers)', function () {

	var fp = makeFailureProxy(stub);


	describe('Fields', function () {


		it('exception translation: should be able to pass along different result and exception', function (done) {
			stub.nextResult = new Error();
			var otherError = "custom error";

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onNetworkException = function () {
				expect(this.ctxt.callError).not.to.equal(stub.nextResult);
				expect(this.ctxt.callError).to.be.instanceof(NetworkError);
				expect(this.ctxt.callResult).to.equal(true);
				this.ctxt.proceed();
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				expect(this.ctxt.callError).to.eql(stub.nextResult);

				//change outcome here
				this.ctxt.callError = otherError
				this.ctxt.callResult = true;
				this.ctxt.proceed();
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).not.to.equal(stub.nextResult);
				expect(err).to.equal(otherError);
				expect(res).to.equal(true);
				done();
			});

		});
	});

	describe('Methods', function () {
		it('Method: succeed(), should immediately invoke continuation', function (done) {
			stub.nextResult = new Error();
			var value = 42;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked.'))
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				this.ctxt.succeed(value);
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.be.undefined;
				expect(res).to.equal(value);
				done();
			});

		});


		it('Method: fail(), should immediately invoke continuation', function (done) {
			stub.nextResult = new Error();
			var value = 42;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked.'))
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				this.ctxt.fail(value);
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.equal(value);
				expect(res).to.be.undefined;
				done();
			});
		});


		it('Method: continue()', function (done) {
			stub.nextResult = new Error();
			var value = 42;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked.'))
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				this.ctxt.continue(value, value);
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(res).to.equal(value);
				expect(err).to.equal(value);
				done();
			});
		});


		it('Method: retry() (1x)', function (done) {
			stub.nextResult = new Error();

			var counter = 0;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked'));
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				counter++;
				stub.nextResult = true;
				this.ctxt.retry();
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(counter).to.equal(1);
				expect(err).to.be.undefined;
				expect(res).to.be.true;
				done();
			});
		});


		it('Method: retry() (10x)', function (done) {
			stub.nextResult = new Error();

			var counter = 0;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked'));
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				counter++;
				if (counter === 10)
					stub.nextResult = true;

				this.ctxt.retry();
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(counter).to.equal(10);
				expect(err).to.be.undefined;
				expect(res).to.be.true;
				done();
			});
		});


		it('Method: alternateCall() (same callback)', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked'));
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				stub.nextResult = true;
				this.ctxt.alternativeCall(this.ctxt.callName, this.ctxt.callArgs());
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				expect(err).to.be.undefined;
				expect(res).to.be.true;
				done();
			});
		});


		it('Method: alternativeCall() (other callback)', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be invoked'));
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				stub.nextResult = true;
				this.ctxt.alternativeCall(this.ctxt.callName, this.ctxt.callArgs(), function (err, res) {
					done();
				});
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('should not be called.'));
			});
		});


		it('Method: hasFailureContinuation()', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				done(new Error('should not be called.'));
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				stub.nextResult = true;
				this.ctxt.hasFailureContinuation();
				setTimeout(function () {
					done();
				}, 250);
			};

			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;


			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('should not be called.'));
			});
		});
	});
});