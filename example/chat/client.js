'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


var options = {
    defaultRpcTimeout: Infinity,
    leaseRenewOnExpire: true
};

var myClient = new ClientRpc('http://127.0.0.1:3000', options);
var fp = makeFailureProxy(adapter);

//buffer calls...
var myClientA = fp(myClient, 'CLeafA');
var myClientB = fp(myClient, 'CLeafB');


///////////////////////////////////////////////////////////////////////

//var blockedUsers = {};
//var clientId = myClient.id;

myClient.expose({
    'addChatMessage': function (author, msg) {

        // if (blockedUsers[author])
        //     throw new MessageBlockedError('User blocked your message.');

        formatMessageDOM(msg, author);

    },
    'addInformationMessage': function (msg) {

        formatMessageDOM(msg, '');

    }
});

var speakMsg = function () {

    //get the values
    var msg = $message.val();

    myClientA.rpc('newChatMsg', [myClient.id, msg], function (err, res) {
        $message.val('');
    });
};

var setName = function () {

    var author = $author.val();

    //
    myClientB.rpc('setName', [myClient.id, author], function (err, res) {

        $author.val('');

    });
};

//////////////////////////////////
// var blockUser = function () {

//     var user = $blockUsername.val();
//     blockedUsers[user] = true;

// };

// var unblockUser = function () {
//     var user = $blockUsername.val();
//     delete blockedUsers[user];

// };