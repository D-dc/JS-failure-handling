'use strict';

/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, NoConnectionError, SerializationError, DeserializionError*/


var options =  {
    defaultRpcTimeout: Infinity,
    leaseRenewOnExpire: true
};

var myClient = new ClientRpc('http://127.0.0.1:3000', options);


//buffer calls...
var myClientA = makeFailureProxy(myClient,  'CLeafA');
var myClientB = makeFailureProxy(myClient,  'CLeafB');


var blockedUsers = {};
var name;//todo

myClient.expose({
    'hearMsg': function(author, msg) {
        
        console.log('Received', author, msg);
        if(blockedUsers[author])
            throw new MessageBlockedError('User ' + $author.val() + ' blocked your message.');
        
        addMessageFormat(msg, author);

    },
    'serverInfoMsg': function(msg) {
        
        addMessageFormat(msg, '');
    
    }
});

var speakMsg = function() {
    
    //get the values
    var msg = $message.val();
    var author = $author.val();
    
    myClientA.rpc('sayMsg', [author, msg], function(err, res) {
        $message.val('');
    });
};

var setName = function() {

    var author = $author.val();
    
    //
    myClientB.rpc('setName', [myClientB.id.toString(), author], function(err, res) {

        if(err){
            $author.val('');
        }
    });
};



var blockUser = function(){

    var user = $blockUsername.val();
    blockedUsers[user] = true;
    console.log('blockuser', user)
};

var unblockUser = function(){
    var user = $blockUsername.val();
    delete blockedUsers[user];
    console.log('unblockuser', user)
};