'use strict';

//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

var UniqueLogger = (function () {
	var instance;
	 
	function createInstance() {
		return new LogObject();
	};
	 
	return {
		getInstance: function () {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		}
	};
})();

var LogObject = function(){
	this.textLog = [];
};

LogObject.prototype.append = function(newData){
	
	this.textLog.push(newData);

};

LogObject.prototype.printLog = function(){
	
	for (var i in this.textLog) {
	    console.log(this.textLog[i]);
	}
};

if(typeof exports !== 'undefined'){
	global.UniqueLogger = UniqueLogger;
}