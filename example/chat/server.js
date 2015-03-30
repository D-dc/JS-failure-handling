'use strict';

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('rpc'),//require('../../lib/rpc-server.js'),
    port = process.env.PORT || 3000;

require('../../nodeHandling.js'),
require('./error.js');


serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});

app.use('/rpc', express.static(__dirname + '/../../node_modules/rpc/client/'));
app.use('/handling', express.static(__dirname + '/../../'));
app.use('/', express.static(__dirname + '/'));



///////////////////////////////////////////////////////////////////////


//We Put calls (chat messages) in queues for 2 minutes.
var options = {
    pingTimeout: 30000, //client2server
    pingInterval: 6000, 
    defaultRpcTimeout: Infinity 
};

// make the ServerRpc by giving the http server, options
var rpc = new ServerRpc(serverHttp, options);

var myServer = makeFailureProxy(rpc,  'LeafB');


var usernames = {};

myServer.onConnection(function(client){

    myServer.rpcCall('serverInfo', ['new client joined ' + client.id.toString() + '.' ]);

    client.on('disconnect', function(){ 
        myServer.rpcCall('serverInfo', ['client ' + findUsername(client.id) + ' left.']);
        //deleteById(client.id);
    }); 

    client.on('error', function(d) { 
        myServer.rpcCall('serverInfo', ['error'+d])});

    client.on('reconnect', function(d) { 
        myServer.rpcCall('serverInfo', ['reconnect'+d])});
});

var deleteById = function(id){
    for (var i in usernames) {
        if(usernames[i] === id)
            delete usernames[i];
    };
};

var findUsername = function(id){
    for (var i in usernames) {
        if(usernames[i] === id)
            return i;
    };
};

var containsHtml = function(v){
    var r= new RegExp("<([A-Za-z][A-Za-z0-9]*)\\b[^>]*>(.*?)</\\1>");
    return r.test(v);
};

//Expose functions to be called from client
myServer.expose({
    'sayMsg': function(author, message) {

        if(!author || !usernames[author]) throw new NoAuthorError('message is missing an author.');
        if(!message) throw new EmptyMessageError('empty messages are not allowed.');
        if(containsHtml(author) || containsHtml(message)) throw new HtmlNotAllowedError('No HTML allowed in username or message.')
        
        //broadcast
        myServer.rpcCall('hearMsg', [author, message]);
    }, 
    'setName': function(client, name) {
        console.log(client, name)
        if(containsHtml(client) || containsHtml(name)) throw new HtmlNotAllowedError('No HTML allowed in username.')
        if(usernames[name] && usernames[name] !== client) throw new UsernameNotAllowedError(name + ' is already in use.');

        console.log('Setting username ', name, ' for ', client);
        
        var prevName = findUsername(client);
        if(prevName){
            deleteById(client);
            myServer.rpcCall('serverInfo', [prevName + ' is now known as ' + name + '.']);
        }else{
            myServer.rpcCall('serverInfo', [client + ' is now known as ' + name + '.']);
        }
        
        usernames[name] = client;
        
    }
});