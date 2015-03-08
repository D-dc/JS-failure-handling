'use strict';
	//network proxy
	var makeNetworkErrorProxy = function(target){
	    return makeJSProxy(target, {
	        rpcCall: function(originalCall, args, context, subject){
	        	var cb = args[2]; 

	        	args[2] = function(err, res){

	        		if(err && err instanceof TimeOutError){
	        			alert('call timed out.');
	        			// do not propagate the error
	        		}else{
	        			return cb(err, res);
	        		}
	        		
	        	};

	            return originalCall.apply(context, args);
	        }
	    });
	};

	//application proxy
	var makeApplicationErrorProxy = function(target){
	    return makeJSProxy(target, {
	        rpcCall: function(originalCall, args, context, subject){ 
	        	var cb = args[2]; 

	        	args[2] = function(err, res){

	        		if(err && err instanceof ExpectedNumberError){
	        			alert(err.message);
	        			// do not propagate the error
	        			// could do: cb(err, 0);
	        		}else{
	        			return cb(err, res);
	        		}
	        		
	        	};

	            return originalCall.apply(context, args);
	        }
	    });
	};

	//log proxy
	var makeLogProxy = function(target){
   		var counter = 0;

   		var writeLog = function(msg){
   			counter++;
   			console.log('Log ', counter, ': ', msg);
   		};

    	return makeJSProxy(target, {
	        rpcCall: function(originalCall, args, context, subject){
	        	var foreignFuncName = args[0]; 
	        	var foreignFuncArgs = args[1]; 
	        	var cb = args[2]; 
	        	
	        	writeLog('CALL ' + foreignFuncName + foreignFuncArgs);
	        	args[2] = function(err, res){
	        		writeLog('RESULT ' + res + err);
	        		return cb(err, res);
	        	};
	        		
	            return originalCall.apply(context, args);
	        }
	    });
	};