'use strict';


var UniqueBuffer = (function () {
	var instance;

	function createInstance() {
		return new BufferSingleton();
	};

	return {
		getInstance: function () {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		}
	}
})();


var BufferSingleton = function () {
	this.buffer = [];
	this.flushInstalled = false;
};

BufferSingleton.prototype.bufferCall = function (c) {

	this.buffer.push(c);
	console.log('buffer', c, this.buffer.length);
};

BufferSingleton.prototype.flushBuffer = function () {
	var self = this;
	if (!this.buffer.length) {
		this.flushInstalled = false;
		return;
	}

	var buffer = this.buffer;
	var thunk = buffer[0];
	console.log('current buffer', buffer, thunk);


	thunk(function (originalCb) {
		return function (err, res, retry) {
			console.log('2. got result', err, res);

			originalCb(err, res, retry);
			buffer.splice(0, 1);

			self.flushBuffer();

		};
	});
};

BufferSingleton.prototype.installFlush = function (stub) {
	var self = this;
	if (this.flushInstalled) return;

	this.flushInstalled = true;

	stub.onceConnected(function () {
		console.log('flushing buffer');
		self.flushBuffer();
	});
};

if (typeof exports !== 'undefined') {
	global.UniqueBuffer = UniqueBuffer;
}