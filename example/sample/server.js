'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/
/*global NoAuthorError, EmptyMessageError, ContentNotAllowedError, UsernameNotAllowedError*/

var express = require('express'),
    app = express(),
    ServerRpc = require('../../../RPCT/index.js');

require('../../nodeHandling.js');



app.use('/rpc', express.static(__dirname + '/../../../RPCT/client/'));
app.use('/handling', express.static(__dirname + '/../../'));
app.use('/', express.static(__dirname + '/'));


///////////////////////////////////////////////////////////////////////


var server = new ServerRpc(app,3000, {});
var a = 1;
{
    var serveronly = 3;
    var serverfunction = function (x) {
        return x + a;
    };
    serverfunction(a);
}
server.expose({
    serverfunction: function (x, callback) {
        return x + a;
    }
});
