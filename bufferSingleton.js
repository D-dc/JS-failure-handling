'use strict';

var debug = require('debug')('handler buffer');

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
	this.waitForResult = false;
};

BufferSingleton.prototype.bufferCall = function (call) {

	this.buffer.push(call);
	debug('Buffer call', call, '. Calls buffered: ', this.buffer.length);

	this.installFlush(call.stub);
};

BufferSingleton.prototype.flushBuffer = function () {
	var self = this;
	var buffer = this.buffer;

	debug('Flush buffer', buffer, this.waitForResult);
	if (!buffer.length) {
		this.flushInstalled = false;
		return;
	}

	if (this.waitForResult) return;
	this.waitForResult = true;

	var thunk = buffer.shift();

	//only continue with next call if the previous is entirely finished.
	thunk._doOnResolved(function () {
		self.waitForResult = false;
		self.flushBuffer();
	});

	//
	thunk.retry();
};

BufferSingleton.prototype.installFlush = function (stub) {
	var self = this;
	if (this.flushInstalled) return;
	this.flushInstalled = true;

	stub.onceConnected(function () {
		self.flushBuffer();
	});
};

global.UniqueBuffer = UniqueBuffer;
