'use strict';

/*@useHandler Log*/
{
	var usernames = {};

	var deleteById = function (id) {
		for (var i in usernames) {
			if (usernames[i] === id)
				delete usernames[i];
		}
	};

	var findUsername = function (id) {
		for (var i in usernames) {
			if (usernames[i] === id)
				return i;
		}
		return false;
	};

	var formatMessageDOM = function (msg, author) {
		// just JQuery GUI stuff...
	};

	/*@Client*/
	/*@useHandler Buffer,Application*/
	{
		var id = RANDOMID();
		var username;

		var addChatMessage = function (author, msg) {
			formatMessageDOM(msg, author);
		};

		var addInformationMessage = function (msg) {
			formatMessageDOM(msg, '');
		};

		var speakMsg = function () {
			var msg = $('#message').val();
			newChatMsg(id, msg);
			$('#message').val('');
		};

		/*@useHandler RetryUsername*/
		{
			var setName = function () {
				var author = $('#author').val();
				username = setName(id, author);
				$('#author').val('');
			};
		}

	}

	/*@Server*/
	/*@useHandler Buffer*/
	{

		var newChatMsg = function (client, message) {

			if (!client || !findUsername(client)) throw new NoAuthorError('Message is missing an author.');
			if (!message) throw new EmptyMessageError('Empty messages are not allowed.');

			//broadcast
			addChatMessage(findUsername(client), message);
		};

		/*@useHandler +TryOnce*/ //'+' means it has priority, hence here if tryonce handler is used, the Buffer handler will not be used.9o
		{
			var setName = function (client, name) {

				if (!name) throw new ContentNotAllowedError('No empty username allowed.');
				if (usernames[name] && usernames[name] !== client) throw new UsernameNotAllowedError(name + ' is already in use.');

				var oldName = findUsername(client);
				var msg;

				if (!oldName) {
					msg = name + ' joined.';
				} else {
					deleteById(client);
					msg = oldName + ' is now known as ' + name + '.';
				}

				addInformationMessage(msg);
				usernames[name] = client;

				return name;
			};

			//Nice to be able to do something like this:

			// myServer.onConnection(function (clientSocket) {
			// 	addInformationMessage('new client joined ' + clientSocket.id.toString() + '.');

			// 	clientSocket.onDisconnected(function () {
			// 		addInformationMessage('client ' + findUsername(clientSocket.id) + ' left.');
			// 	});

			// });
		}
	}

}


//////////////////////////////////////////

/*@define-handler:Log*/
{
	//Would be predefined but otherwise would look like this:
	var Log = {
		logger: UniqueLogger.getInstance(), //will come in leaf constructor after transpile.
		//'onException' will only be called if there is no other handling method was called in this handler already.
		onException: function (call) { //call will change to this.ctxt after transpile.
			this.logger.append('RPC CALL: ' + call.callName + ' ARGS: ' + call.callArgs() + ' ERROR: ' + call.callError);
		},
		//if we a 'NativeException', we will not call 'onException' afterwards.
		onNativeException: function (call) { //call will change to this.ctxt after transpile.

			this.logger.append('RPC CALL: ' + call.callName + ' ARGS ' + call.callArgs() + ' ERROR: ' + call.callError);
			this.logger.append(call.callError.stack);
		}
	}
}

/*@define-handler:Buffer*/
{
	//Would be predefined but otherwise would look like this:
	var Buffer = {
		buffer: UniqueBuffer.getInstance(), //will come in leaf constructor after transpile.
		//only capture 'NetworkException' in this handler.
		onNetworkException: function (call) { //call will change to this.ctxt after transpile.
			var buffer = this.buffer;

			//this takes into account retransmissions on the callee side.
			//hence, if the original call did succeed (but we did not get the result because of Omission failure),
			//the callee will notice and not perform the computation again.
			buffer.bufferCall(this.ctxt);

		}
	}
}

/*@define-handler:Application*/
{
	//Custom programmer defined.
	var Application = {
		//only capture 'ApplicationException' in this handler.
		onApplicationException: function (call) {
			//The 'call argument pretends to know about the return values.'
			var error = call.callError;
			$('#alert').html(error.message);
			$('#alert').css('display', 'block');
		}
	};
}

/*@define-handler:RetryUsername*/
{
	//Custom programmer defined.
	//changes the author arg in: setName(myClient, author); if we get the 'UsernameNotAllowedError' exception.
	var RetryUsername = {
		//only capture 'ApplicationException' in this handler.
		onApplicationException: function (call) {
			if (call.isOf(UsernameNotAllowedError)) { //filter ApplicationException of this kind.
				var originalArgs = call.callArgs;

				var name = originalArgs[1];
				originalArgs[1] = name + Math.floor((Math.random() * 100) + 1);

				//perform another call with same name (call.callName) but changed call arguments.
				call.alternateCall(call.callName, originalArgs);
			}
		}
	};
}

/*@define-handler:TryOnce*/
{
	//Would be predefined but otherwise would look like this:
	var TryOnce = {
		//only capture 'NetworkException' in this handler.
		onNetworkException: function () {
			//Since this handler gets executed when the call failed, we do not bother retrying. 
			//This handling should be executed on non-important calls with TryOnce semantics.
		}
	}
}