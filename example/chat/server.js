'use strict';

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('rpc'),//require('../../lib/rpc-server.js'),
    port = process.env.PORT || 3000,
    h = require('../../nodeHandling.js');

console.log(h)

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});

app.use('/rpc', express.static(__dirname + '/../../node_modules/rpc/client/'));
app.use('/handling', express.static(__dirname + '/../../'));
app.use('/', express.static(__dirname + '/'));


var NoAuthorError = function (message) {
    this.name = 'NoAuthorError';
    this.message = (message || '');
};

NoAuthorError.prototype = new Error();
NoAuthorError.prototype.constructor = NoAuthorError;


var EmptyMessageError = function (message) {
    this.name = 'EmptyMessageError';
    this.message = (message || '');
};

EmptyMessageError.prototype = new Error();
EmptyMessageError.prototype.constructor = EmptyMessageError;

var UsernameNotAllowedError = function (message) {
    this.name = 'UsernameNotAllowedError';
    this.message = (message || '');
};

UsernameNotAllowedError.prototype = new Error();
UsernameNotAllowedError.prototype.constructor = UsernameNotAllowedError;
///////////////////////////////////////////////////////////////////////


//We Put calls (chat messages) in queues for 2 minutes.
var options = {
    pingTimeout: 30000, //client2server
    pingInterval: 6000, 
    defaultRpcTimeout: Infinity 
};

// make the ServerRpc by giving the http server, options
var rpc = new ServerRpc(serverHttp, options);

var myServer =makeFailureProxy(rpc,  new LeafB());


var usernames ={};

myServer.onConnection(function(client){
    console.log(client.remoteClientId)
    myServer.rpcCall('serverInfo', ['new client joined' + client.remoteClientId.toString() + '.' ]);

    //EVENTS called on server
    client.on('disconnect', function(){ myServer.rpcCall('serverInfo', ['client disconnect'])}); // on disconnected        
    client.on('error', function(d) { myServer.rpcCall('serverInfo', ['error'+d])});
    client.on('reconnect', function(d) { myServer.rpcCall('serverInfo', ['reconnect'+d])});
});

//Expose functions to be called from client
myServer.expose({
    'sayMsg': function(author, message) {
        
        if(!author || !usernames[name]) throw new NoAuthorError('message is missing an author');
        if(!message) throw new EmptyMessageError('sending an empty message');

        console.log('broadcasting to all clients listening');
        
        myServer.rpcCall('hearMsg', [author, message]);
    }, 
    'setName': function(client, name) {
        console.log('Setting username ', name, ' for ', client)
        if(usernames[name]){
            
            throw new UsernameNotAllowedError(name + ' is already in use.')
        
        }else{
            
            usernames[name] = client;
        
        }
    }
});