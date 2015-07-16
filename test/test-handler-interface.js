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

describe('Test call object interface (1 Handler)', function () {

	var fp = makeFailureProxy(stub);


	describe('Fields', function () {


		it('Field: Args & callName', function (done) {
			stub.nextResult = new Error();

			var callName = 'name',
				arg1 = 1,
				arg2 = 2;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				expect(this.ctxt.callName).to.equal(callName);
				expect(this.ctxt.callArgs()).to.eql([arg1, arg2]);
				done();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc(callName, arg1, arg2, function (err, res) {});
		});


		it('Field: Error', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				expect(this.ctxt.callError).to.eql(stub.nextResult);
				done();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {});
		});


		it('Field: Result', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				expect(this.ctxt.callResult).to.equal(undefined);
				done();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {});
		});

	});


	describe('Methods', function () {
		it('Method: succeed()', function (done) {
			stub.nextResult = new Error();

			var value = 42;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				this.ctxt.succeed(value);
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(res).to.equal(value);
				expect(err).to.be.undefined;
				done();
			});
		});


		it('Method: fail()', function (done) {
			stub.nextResult = new Error();

			var value = 42;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				this.ctxt.fail(value);
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(res).to.be.undefined;
				expect(err).to.equal(value);
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
				this.ctxt.continue(value, value);
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
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
				counter++;
				stub.nextResult = true;
				this.ctxt.retry();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
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
				counter++;
				if (counter === 10)
					stub.nextResult = true;
				this.ctxt.retry();
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				expect(counter).to.equal(10);
				expect(err).to.be.undefined;
				expect(res).to.be.true;
				done();
			});
		});


		it('Method: alternativeCall() (same callback)', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				stub.nextResult = true;
				this.ctxt.alternativeCall(this.ctxt.callName, this.ctxt.callArgs());
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
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
				stub.nextResult = true;
				this.ctxt.alternativeCall(this.ctxt.callName, this.ctxt.callArgs(), function (err, res) {
					done();
				});
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('should not be called.'));
			});
		});


		it('Method: hasFailureContinuation()', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				stub.nextResult = true;
				this.ctxt.hasFailureContinuation();
				setTimeout(function () {
					done();
				}, 250);
			};

			//ALeaf state
			var ALeaf = function () {};
			ALeaf.parent = A;
			ALeaf.flagPriority = false;
			ALeaf.prototype = new HandlerNode();
			ALeaf.prototype.constructor = ALeaf;

			var AProxy = fp(ALeaf);

			AProxy.rpc('name', 1, 2, function (err, res) {
				done(new Error('should not be called.'));
			});
		});


		it('Method: no proceed.', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				console.log('c')
				done(new Error('should not be called.'));

			};

			//B Logic
			var B = function () {};
			B.super = function (target) {
				target.handleException(A);
			};
			B.flagPriority = false;
			B.onException = function () {
				done();
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


		it('Method: no proceed, invoke continuation.', function (done) {
			stub.nextResult = new Error();

			//A Logic
			var A = function () {};
			A.flagPriority = false;

			//B Logic
			var B = function () {};
			B.super = function (target) {
				target.handleException(A);
			};
			B.flagPriority = false;


			//BLeaf state
			var BLeaf = function () {};
			BLeaf.parent = B;
			BLeaf.flagPriority = false;
			BLeaf.prototype = new HandlerNode();
			BLeaf.prototype.constructor = BLeaf;

			var BProxy = fp(BLeaf);

			BProxy.rpc('name', 1, 2, function (err, res) {
				done();
			});
		});


		it('Method: proceed.', function (done) {
			stub.nextResult = new Error();

			var counter = 0;

			//A Logic
			var A = function () {};
			A.flagPriority = false;
			A.onException = function () {
				counter++;
				this.ctxt.proceed();
			};

			//B Logic
			var B = function () {};
			B.parent = A;
			B.flagPriority = false;
			B.onException = function () {
				counter++;
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
				if (counter == 2)
					done();
			});
		});
	});
});