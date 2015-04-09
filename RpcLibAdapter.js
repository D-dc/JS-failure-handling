'use strict';
// Adapter for RPC lib
// https://github.com/dielc/rpc

/*
stub.rpc('remoteFunction', [a, b, c], function(err, res, retry) {}, 1000);
*/

var adapter = {
	stubMethodName: 'rpc',

	stubRPCFunctionNamePosition: 0,
	stubRPCArgsPosition: 1,
	stubRPCContinuationPosition: 2,

	continuationErrorPosition: 0,
	continuationResultPosition: 1,
	continuationRetryPosition: 2,

	getRpcFunctionName: function (args) {
		return args[this.stubRPCFunctionNamePosition];
	},
	setRpcFunctionName: function (methodArgs, name) {
		methodArgs[this.stubRPCFunctionNamePosition] = name;
		return methodArgs;
	},
	getRpcArgs: function (args) {
		return args[this.stubRPCArgsPosition];
	},
	setRpcArgs: function (methodArgs, rpcArgs) {
		methodArgs[this.stubRPCArgsPosition] = rpcArgs;
		return methodArgs;
	},
	getRpcContinuation: function (args) {
		return args[this.stubRPCContinuationPosition];
	},
	setRpcContinuation: function (methodArgs, continuation) {
		methodArgs[this.stubRPCContinuationPosition] = continuation;
		return methodArgs;
	},
	getContinuationError: function (continuationArgs) {
		return continuationArgs[this.continuationErrorPosition];
	},
	setContinuationError: function (continuationArgs, val) {
		continuationArgs[this.continuationErrorPosition] = val;
		return continuationArgs;
	},
	getContinuationResult: function (continuationArgs) {
		return continuationArgs[this.continuationResultPosition];
	},
	setContinuationResult: function (continuationArgs, val) {
		continuationArgs[this.continuationResultPosition] = val;
		return continuationArgs;
	},
	getContinuationRetry: function (continuationArgs) {
		//return;
		return continuationArgs[this.continuationRetryPosition];
	},
	setContinuationRetry: function (continuationArgs, val) {
		//return;
		continuationArgs[this.continuationRetryPosition] = val;
		return continuationArgs;
	},
	buildNewRpcArgs: function (functionName, args, continuation) {
		var newArgs = [];
		continuation = continuation || function () {};
		newArgs[this.stubRPCFunctionNamePosition] = functionName;
		newArgs[this.stubRPCArgsPosition] = args;
		newArgs[this.stubRPCContinuationPosition] = continuation;
		return newArgs;
	},
	buildNewCbArgs: function (err, res, retry) {
		var newArgs =[];
		newArgs[this.continuationErrorPosition] =err;
		newArgs[this.continuationResultPosition] =res;
		newArgs[this.continuationRetryPosition] =retry;

	}
};

if (typeof exports !== 'undefined') {
	module.exports = adapter;
}