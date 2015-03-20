'use strict';

var TimeOutError = function (message) {
    this.name = 'TimeOutError';
    this.message = (message || '');
};

TimeOutError.prototype = new Error();
TimeOutError.prototype.constructor = TimeOutError;

////////

var FunctionNotFoundError = function (message) {
    this.name = 'FunctionNotFoundError';
    this.message = (message || '');
};

FunctionNotFoundError.prototype = new Error();
FunctionNotFoundError.prototype.constructor = FunctionNotFoundError;

////////

var ExpectedNumberError = function (message) {
    this.name = 'ExpectedNumberError';
    this.message = (message || '');
};

ExpectedNumberError.prototype = new Error();
ExpectedNumberError.prototype.constructor = ExpectedNumberError;

////////

//simulate possible failures
var RPC = function(){this.a=1;};

RPC.prototype.rpcCall = function(func, argArr, cb, due){
	//console.log('this,', this.a)
	var dueTimeout = setTimeout(function(){
		clearTimeout(cbTimeout);
		var err= new TimeOutError();
		cb(err);
	}, due);

	var cbTimeout = setTimeout(function(){
		clearTimeout(dueTimeout);
		var celcius = argArr[0];
		
		/*cb(new SyntaxError());*/
		//APPLICATION CODE
		var fahrenheit = convert(celcius);
		if(fahrenheit){
			cb(null, fahrenheit);
		}else{ //NaN
			var err = new ExpectedNumberError('\'' + celcius + '\' is not a number.');
			cb(err);
		}
		//APPLICATION CODE

	}, Math.floor((Math.random() * 1000) + 1));
	return 1;
};

// Actual application code...
//APPLICATION CODE
{
    var convert = function(celcius){
    	return celcius * factor() + add;
    };

	var factor = function () {
	    return 9 / 5;
	};
	var add = 32;

}
//APPLICATION CODE
