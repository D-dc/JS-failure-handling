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
				setName(myClientB.id.toString(), author)
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

		/*Use-handler:+tryOnce*/
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
	//is pre-defined
}

/*define-handler:Buffer*/
{
	//is pre-defined
}

/*define-handler:Application*/
{
	var Application = {
		onApplicationException: function (call) {
			//The 'call argument pretends to know about the return values.'
			var error = call.callError;
			displayGUIAlert(error.message);
		}
	};
}

/*define-handler:RetryUsername*/
{
	var RetryUsername = {
		onApplicationException: function (call) {
			if (call.isOf(UsernameNotAllowedError)) {
				var originalArgs = call.callArgs;

				var name = originalArgs[1];
				var newName = name + Math.floor((Math.random() * 100) + 1);
				originalArgs[1] = newName;

				call.alternateCall(call.callName, originalArgs);
			}
		}
	};
}