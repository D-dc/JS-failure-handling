'use strict';

var options =  {
    defaultRpcTimeout: Infinity,
    leaseRenewOnExpire: true
};

var rpc = new ClientRpc('http://127.0.0.1:3000', options);
var myClientB = makeFailureProxy(rpc,  'LeafB');

//buffer calls...
var myClientA = makeFailureProxy(rpc,  'LeafA');


rpc.expose({
    'hearMsg': function(author, msg) {
        
        console.log('Received', author, msg);
        addMessageFormat(msg, author);

    },
    'serverInfo': function(msg) {
        
        addMessageFormat(msg, '');
    
    }
});

var speakMsg = function() {
    
    //get the values
    var msg = $message.val();
    var author = $author.val();
    
    myClientA.rpcCall('sayMsg', [author, msg], function(err, res) {
        $message.val('');
    });
};

var setName = function() {

    var author = $author.val();
    
    //
    myClientB.rpcCall('setName', [myClientB.id.toString(), author], function(err, res) {

        if(err){
            $author.val('');
        }
    });
};