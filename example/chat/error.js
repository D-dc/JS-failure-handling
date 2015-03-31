'use strict';

var NoAuthorError = function (message) {
    this.name = 'NoAuthorError';
    this.message = (message || '');
    this.stack = (new Error()).stack;
};

NoAuthorError.prototype = Object.create(Error.prototype);
NoAuthorError.prototype.constructor = NoAuthorError;


var EmptyMessageError = function (message) {
    this.name = 'EmptyMessageError';
    this.message = (message || '');
    this.stack = (new Error()).stack;
};

EmptyMessageError.prototype = Object.create(Error.prototype);
EmptyMessageError.prototype.constructor = EmptyMessageError;

var UsernameNotAllowedError = function (message) {
    this.name = 'UsernameNotAllowedError';
    this.message = (message || '');
    this.stack = (new Error()).stack;
};

UsernameNotAllowedError.prototype = Object.create(Error.prototype);
UsernameNotAllowedError.prototype.constructor = UsernameNotAllowedError;

var ContentNotAllowedError = function (message) {
    this.name = 'ContentNotAllowedError';
    this.message = (message || '');
    this.stack = (new Error()).stack;
};

ContentNotAllowedError.prototype = Object.create(Error.prototype);
ContentNotAllowedError.prototype.constructor = ContentNotAllowedError;

var MessageBlockedError = function (message) {
    this.name = 'MessageBlockedError';
    this.message = (message || '');
    this.stack = (new Error()).stack;
};

MessageBlockedError.prototype = Object.create(Error.prototype);
MessageBlockedError.prototype.constructor = MessageBlockedError;


if(typeof exports !== 'undefined'){
	global.NoAuthorError = NoAuthorError;
	global.EmptyMessageError = EmptyMessageError;
	global.UsernameNotAllowedError = UsernameNotAllowedError;
	global.ContentNotAllowedError = ContentNotAllowedError;
    global.MessageBlockedError = MessageBlockedError;
}