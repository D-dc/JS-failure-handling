'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/
/*global NoAuthorError, EmptyMessageError, ContentNotAllowedError, UsernameNotAllowedError*/

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('rpc'),//require('../../lib/rpc-server.js'),
    port = process.env.PORT || 3000;

require('../../nodeHandling.js'),
require('../../genServerNodes.js')
require('./error.js');


serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});

app.use('/rpc', express.static(__dirname + '/../../node_modules/rpc/client/'));
app.use('/handling', express.static(__dirname + '/../../'));
app.use('/', express.static(__dirname + '/'));



///////////////////////////////////////////////////////////////////////


var options = {
    pingTimeout: 30000, //client2server
    pingInterval: 6000, 
    defaultRpcTimeout: Infinity 
};

var myServer = new ServerRpc(serverHttp, options);

//var myServer = r;//makeFailureProxy(r,  'CLeafB');

var myServerA = makeFailureProxy(myServer,  'SLeafA');
var myServerB = makeFailureProxy(myServer,  'SLeafB');


var usernames = {};

var deleteById = function(id){
    for (var i in usernames) {
        if(usernames[i] === id)
            delete usernames[i];
    }
};

var findUsername = function(id){
    for (var i in usernames) {
        if(usernames[i] === id)
            return i;
    }
};

var containsHtml = function(v){
    var r = new RegExp('<([A-Za-z][A-Za-z0-9]*)\\b[^>]*>(.*?)</\\1>');
    return r.test(v);
};

myServer.onConnection(function(client){
    myServerB.rpc('serverInfoMsg', ['new client joined ' + client.id.toString() + '.' ]);

    client.on('disconnect', function(){ 
        myServerB.rpc('serverInfoMsg', ['client ' + findUsername(client.id) + ' left.']);
    }); 

    client.on('error', function(d) { 
        myServerB.rpc('serverInfoMsg', ['error'+d]);
    });

    client.on('reconnect', function(d) { 
        myServerB.rpc('serverInfoMsg', ['reconnect'+d]);
    });
});

//Expose functions to be called from client
myServer.expose({
    'sayMsg': function(author, message) {

        //ApplicationErrors
        if(!author || !usernames[author]) throw new NoAuthorError('message is missing an author.');
        if(!message) throw new EmptyMessageError('empty messages are not allowed.');
        if(containsHtml(author) || containsHtml(message)) throw new ContentNotAllowedError('No HTML allowed in username or message.');
        
        //broadcast
        myServerA.rpc('hearMsg', [author, message], function (err, res){
            console.log('myServerA', err, res)
        });
    }, 
    'setName': function(client, name) {

        //ApplicationErrors
        if(!name) throw new ContentNotAllowedError('No empty username allowed.');
        if(containsHtml(client) || containsHtml(name)) throw new ContentNotAllowedError('No HTML allowed in username.');
        if(usernames[name] && usernames[name] !== client) throw new UsernameNotAllowedError(name + ' is already in use.');
        
        var prevName = findUsername(client);
        var msg;
        if(prevName){
            deleteById(client);
            msg = prevName + ' is now known as ' + name + '.';
        }else{
            msg = client + ' is now known as ' + name + '.';
        }
        
        myServerB.rpc('serverInfoMsg', [msg]);

        usernames[name] = client;
        
    }
});