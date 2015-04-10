'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/
/*global NoAuthorError, EmptyMessageError, ContentNotAllowedError, UsernameNotAllowedError*/

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('../../../RPCT/index.js'),
    port = process.env.PORT || 3000;

require('../../nodeHandling.js'),
    require('./generated/genServerNodes.js'),
    require('./error.js');

var adapter = require('../../RpcLibAdapter.js');

serverHttp.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use('/rpc', express.static(__dirname + '/../../../RPCT/client/'));
app.use('/handling', express.static(__dirname + '/../../'));
app.use('/', express.static(__dirname + '/'));



///////////////////////////////////////////////////////////////////////


var options = {
    pingTimeout: 30000, //client2server
    pingInterval: 6000,
    defaultRpcTimeout: Infinity
};

var myServer = new ServerRpc(serverHttp, options);
var fp = makeFailureProxy(adapter);

var myServerA = fp(myServer, 'SLeafA');
var myServerB = fp(myServer, 'SLeafB');

///////////////////////////////////////////////////////////////////////
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


///////////////////////////////////////////////////////////////////////

myServer.onConnection(function (clientSocket) {

    myServerB.rpc('addInformationMessage', ['new client joined ' + clientSocket.id.toString() + '.']);

    clientSocket.onDisconnected(function () {
        myServerB.rpc('addInformationMessage', ['client ' + findUsername(clientSocket.id) + ' left.']);
    });

});



myServer.expose({
    'newChatMsg': function (client, message) {

        //ApplicationErrors
        if (!client || !findUsername(client)) throw new NoAuthorError('Message is missing an author.');
        if (!message) throw new EmptyMessageError('Empty messages are not allowed.');
        if (containsHtml(client) || containsHtml(message)) throw new ContentNotAllowedError('No HTML allowed in username or message.');

        //broadcast
        myServerA.rpc('addChatMessage', [findUsername(client), message], function () {});
    },
    'setName': function (client, name) {

        //ApplicationErrors
        if (!name) throw new ContentNotAllowedError('No empty username allowed.');
        if (containsHtml(client) || containsHtml(name)) throw new ContentNotAllowedError('No HTML allowed in username.');
        //just for debugging atm.
        if (name === 'test' || name === 'test0' || (usernames[name] && usernames[name] !== client)) throw new UsernameNotAllowedError(name + ' is already in use.');


        var oldName = findUsername(client);
        var msg;
        if (oldName) {
            deleteById(client);
            msg = oldName + ' is now known as ' + name + '.';
        } else {
            msg = client + ' is now known as ' + name + '.';
        }

        //broadcast
        myServerB.rpc('addInformationMessage', [msg]);

        usernames[name] = client;

    }
});

//Expose functions to be called from client