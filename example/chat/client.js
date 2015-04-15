'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


var options = {
    defaultRpcTimeout: Infinity,
    leaseRenewOnExpire: true
};

var myClient = new ClientRpc('http://127.0.0.1:3000', options);
var fp = makeFailureProxy(adapter);

//buffer calls...
var myClientA = fp(myClient, CLeafA);
var myClientB = fp(myClient, CLeafB);

var random = function () {
    return Math.floor((Math.random() * 10000) + 1);
};


///////////////////////////////////////////////////////////////////////
var username;


myClient.expose({
    'addChatMessage': function (author, msg) {
        formatMessageDOM(msg, author);
    },
    'addInformationMessage': function (msg) {
        formatMessageDOM(msg, '');
    }
});

var id = random();

var speakMsg = function () {

    var msg = $('#message').val();

    myClientA.rpc('newChatMsg', [id, msg], function (err, res) {
        $('#message').val('');
    });
};

var setName = function () {

    var author = $('#author').val();

    myClientB.rpc('setName', [id, author], function (err, res) {
        username = res;
        $('#author').val('');

    });
};