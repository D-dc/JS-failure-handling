'use strict';

/*Use-handler:Log*/
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

	var containsHtml = function (v) {
		var r = new RegExp('<([A-Za-z][A-Za-z0-9]*)\\b[^>]*>(.*?)</\\1>');
		return r.test(v);
	};

	var formatMessageDOM = function (msg, author) {
		//...
	};

	/*@Client*/
	/*Use-handler:Buffer,Application*/
	{
		var addChatMessage = function (author, msg) {
			formatMessageDOM(msg, author);
		};

		var addInformationMessage = function (msg) {
			formatMessageDOM(msg, '');
		};


		var speakMsg = function () {
			var msg = readDOM('message');
			newChatMsg(myClientB.id.toString(), msg);
			printDOM('message', '');
		};

		/*Use-handler:RetryUsername*/
		{
			var setName = function () {
				var author = readDOM('author');
				setName(myClientB.id.toString(), author);
				printDOM('author', '');
			};
		}

	}

	/*@Server*/
	/*Use-handler:Buffer*/
	{

		var newChatMsg = function (client, message) {

			if (!client || !findUsername(client)) throw new NoAuthorError('Message is missing an author.');
			if (!message) throw new EmptyMessageError('Empty messages are not allowed.');
			if (containsHtml(client) || containsHtml(message)) throw new ContentNotAllowedError('No HTML allowed in username or message.');

			//broadcast
			addChatMessage(findUsername(client), message);
		};

		/*Use-handler:+TryOnce*/ //'+' means it has priority.
		{
			var setName = function (client, name) {

				if (!name) throw new ContentNotAllowedError('No empty username allowed.');
				if (containsHtml(client) || containsHtml(name)) throw new ContentNotAllowedError('No HTML allowed in username.');
				if (name === 'test' || (usernames[name] && usernames[name] !== client)) throw new UsernameNotAllowedError(name + ' is already in use.');

				var oldName = findUsername(client);
				var msg;

				if (oldName) {
					deleteById(client);
					msg = oldName + ' is now known as ' + name + '.';
				} else {
					msg = client + ' is now known as ' + name + '.';
				}

				addInformationMessage(msg);
				usernames[name] = client;
			};

			//TODO
			myServer.onConnection(function (clientSocket) {
				addInformationMessage('new client joined ' + clientSocket.id.toString() + '.');

				clientSocket.onDisconnected(function () {
					addInformationMessage('client ' + findUsername(clientSocket.id) + ' left.');
				});

			});
		}
	}

}


//////////////////////////////////////////

/*define-handler:Log*/
{
	//Would be predefined but otherwise would look like this:
	var Log = {
		buffer: UniqueBuffer.getInstance(), //will come in leaf constructor after transpile.
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

/*define-handler:Buffer*/
{
	//Would be predefined but otherwise would look like this:
	var Buffer = {
		buffer: UniqueBuffer.getInstance(), //will come in leaf constructor after transpile.
		//only capture 'NetworkException' in this handler.
		onNetworkException: function (call) { //call will change to this.ctxt after transpile.
			var buffer = this.buffer;

			buffer.bufferCall(function (continuation) {
				//this 'retry' method takes into account retransmissions on the callee side.
				//hence, if the original call did succeed (but we did not get the result because of Omission failure),
				//the callee will notice and not perform the computation again.
				call.retry(continuation);
			});

			buffer.installFlush(call.stub);
		}
	}
}

/*define-handler:Application*/
{
	//Custom programmer defined.
	var Application = {
		//only capture 'ApplicationException' in this handler.
		onApplicationException: function (call) {
			//The 'call argument pretends to know about the return values.'
			var error = call.callError;
			displayGUIAlert(error.message);
		}
	};
}

/*define-handler:RetryUsername*/
{
	//Custom programmer defined.
	//changes the author arg in: setName(myClient, author); if we get the 'UsernameNotAllowedError' exception.
	var RetryUsername = {
		//only capture 'ApplicationException' in this handler.
		onApplicationException: function (call) {
			if (call.isOf(UsernameNotAllowedError)) { //filter ApplicationException of this kind.
				var originalArgs = call.callArgs;

				var name = originalArgs[1];
				var newName = name + Math.floor((Math.random() * 100) + 1);
				originalArgs[1] = newName;

				call.alternateCall(call.callName, originalArgs);
			}
		}
	};
}

/*define-handler:TryOnce*/
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