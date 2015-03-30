

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

var HtmlNotAllowedError = function (message) {
    this.name = 'HtmlNotAllowedError';
    this.message = (message || '');
    this.stack = (new Error()).stack;
};

HtmlNotAllowedError.prototype = Object.create(Error.prototype);
HtmlNotAllowedError.prototype.constructor = HtmlNotAllowedError;


if(typeof exports !== 'undefined'){
	global.NoAuthorError = NoAuthorError;
	global.EmptyMessageError = EmptyMessageError;
	global.UsernameNotAllowedError = UsernameNotAllowedError;
	global.HtmlNotAllowedError = HtmlNotAllowedError;
}