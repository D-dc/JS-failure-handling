'use strict';
var Proxy = require('./code.js'),
    assert = require("assert"),
    expect = require('chai').expect;

//////////////////////////////////////////////////////////////////
var Subject = function(){
    this.a = 42;
    this.func = function(){ 
        return this.a++;};
};

Subject.prototype.protoFunc = function(){
    return this.a++;
};

Subject.prototype.protoFuncNormal = function(){
    return this.a;
};

Subject.prototype.unInstFunc = function(){ return this.a;};


//////////////////////////////////////////////////////////////////


//PROXY 1: A proxy that does nothing, just delegates the call.
var makeNoOpProxy = function(target){
    return Proxy.makeJSProxy(target, {
        protoFunc: function(originalCall, args, context){
            return originalCall.apply(context, args);
        }
    });           
};    
 

//PROXY 2: A proxy that drops the operation and not executes the call.
var makeDropOpProxy = function(target){
    return Proxy.makeJSProxy(target, {
        protoFunc: function(originalCall, args, context){
            return context.a;// we bypass the call and just return the unincremented number
        }
    });           
};


//PROXY 3: A proxy that increments a field in the subject.
var makeIncFieldProxy = function(target){
    return Proxy.makeJSProxy(target, {
        protoFuncNormal: function(originalCall, args, context, subject){
            subject.a++;
            return originalCall.apply(context, args);
        }
    });           
};


//PROXY 4: A proxy that decrements a field in the subject.
var makeDecFieldProxy = function(target){
    return new Proxy.makeJSProxy(target, {
        protoFuncNormal: function(originalCall, args, context, subject){
            subject.a--;
            return originalCall.apply(context, args);
        }
    });           
};


//PROXY 5: A proxy that counts the invocations of a method.
var makeInvocCounterProxy = function(target){
    var counter = 0;
    return Proxy.makeJSProxy(target, {
        protoFunc: function(originalCall, args, context, subject){
            counter++;
            originalCall.apply(context, args);
            return counter; //todo
        }
    });           
};


//////////////////////////////////////////////////////////////////

describe('proxy.js tests', function() {
    describe('Delegation Proxy', function() {
        describe('Single', function() {
            it('noOpProxy', function(done) {
                var subject = new Subject();
                var noOpProxy = makeNoOpProxy(subject);
                
                expect(subject.a).to.equal(42);
                expect(subject.func()).to.equal(42);
                expect(subject.a).to.equal(43);

                expect(subject.protoFunc()).to.equal(43);
                expect(subject.a).to.equal(44);

                expect(subject.unInstFunc()).to.equal(44); //direct called
                expect(subject.a).to.equal(44);

                // a = 44
                
                expect(noOpProxy.a).to.equal(44);
                expect(noOpProxy.func()).to.equal(44);
                expect(noOpProxy.a).to.equal(45);

                expect(noOpProxy.protoFunc()).to.equal(45);
                expect(noOpProxy.a).to.equal(46);

                expect(noOpProxy.unInstFunc()).to.equal(46); //direct called
                expect(noOpProxy.a).to.equal(46);

                // a = 46
                expect(subject.a).to.equal(46);
                done();
            }); 
            
            it('dropOpProxy', function(done) {
                var subject = new Subject();
                var dropOpProxy = makeDropOpProxy(subject);
                
                expect(subject.a).to.equal(42);
                expect(subject.func()).to.equal(42);
                expect(subject.a).to.equal(43);

                expect(subject.protoFunc()).to.equal(43);
                expect(subject.a).to.equal(44);

                expect(subject.unInstFunc()).to.equal(44); //direct called
                expect(subject.a).to.equal(44);

                // a = 44

                expect(dropOpProxy.a).to.equal(44);
                expect(dropOpProxy.func()).to.equal(44);
                expect(dropOpProxy.a).to.equal(45);

                expect(dropOpProxy.protoFunc()).to.equal(45);
                expect(dropOpProxy.a).to.equal(45);

                expect(dropOpProxy.unInstFunc()).to.equal(45); //direct called
                expect(dropOpProxy.a).to.equal(45);

                // a = 45
                expect(subject.a).to.equal(45);
                done();
            });
        });     
        
        describe('Double', function() {
            it('noOpProxy', function(done) {
                var subject = new Subject();
                var noOpProxy1 = makeNoOpProxy(subject);
                var noOpProxy2 = makeNoOpProxy(noOpProxy1);
                
                expect(subject.a).to.equal(42);
                expect(subject.func()).to.equal(42);
                expect(subject.a).to.equal(43);

                expect(subject.protoFunc()).to.equal(43);
                expect(subject.a).to.equal(44);

                expect(subject.unInstFunc()).to.equal(44); //direct called
                expect(subject.a).to.equal(44);

                // a = 44
                
                expect(noOpProxy2.a).to.equal(44);
                expect(noOpProxy2.func()).to.equal(44);
                expect(noOpProxy2.a).to.equal(45);

                expect(noOpProxy2.protoFunc()).to.equal(45);
                expect(noOpProxy2.a).to.equal(46);

                expect(noOpProxy2.unInstFunc()).to.equal(46); //direct called
                expect(noOpProxy2.a).to.equal(46);

                // a = 46
                expect(subject.a).to.equal(46);
                done();
            });

            it('dropOpProxy', function(done) {
                var subject = new Subject();
                var dropOpProxy1 = makeDropOpProxy(subject);
                var dropOpProxy2 = makeDropOpProxy(dropOpProxy1);
                
                expect(subject.a).to.equal(42);
                expect(subject.func()).to.equal(42);
                expect(subject.a).to.equal(43);

                expect(subject.protoFunc()).to.equal(43);
                expect(subject.a).to.equal(44);

                expect(subject.unInstFunc()).to.equal(44); //direct called
                expect(subject.a).to.equal(44);

                // a = 44

                expect(dropOpProxy2.a).to.equal(44);
                expect(dropOpProxy2.func()).to.equal(44);
                expect(dropOpProxy2.a).to.equal(45);

                expect(dropOpProxy2.protoFunc()).to.equal(45);
                expect(dropOpProxy2.a).to.equal(45);

                expect(dropOpProxy2.unInstFunc()).to.equal(45); //direct called
                expect(dropOpProxy2.a).to.equal(45);

                // a = 45
                expect(subject.a).to.equal(45);
                done();
            });   
        }); 

        describe('Chaining', function() {
            it('IncFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = makeIncFieldProxy(subject);
                
                expect(incFieldProxy.a).to.equal(42);
                expect(incFieldProxy.func()).to.equal(42);
                expect(incFieldProxy.a).to.equal(43);

                expect(incFieldProxy.protoFuncNormal()).to.equal(44);
                expect(incFieldProxy.a).to.equal(44);

                expect(subject.a).to.equal(44);
                done();
            }); 

            it('DecFieldProxy', function(done) {
                var subject = new Subject();
                var decFieldProxy = makeDecFieldProxy(subject);
                
                expect(decFieldProxy.a).to.equal(42);
                expect(decFieldProxy.func()).to.equal(42);
                expect(decFieldProxy.a).to.equal(43);

                expect(decFieldProxy.protoFuncNormal()).to.equal(42);
                expect(decFieldProxy.a).to.equal(42);

                expect(subject.a).to.equal(42);
                done();
            });

            it('DecFieldProxy before IncFieldProxy', function(done) {
                var subject = new Subject();
                var decFieldProxy = makeDecFieldProxy(subject);
                var incFieldProxy = makeIncFieldProxy(decFieldProxy);
                
                expect(incFieldProxy.a).to.equal(42);
                expect(incFieldProxy.protoFuncNormal()).to.equal(42); //42 = 42 -1 +1
                expect(incFieldProxy.a).to.equal(42);

                expect(subject.a).to.equal(42); //original should be changed
                done();
            });

            it('IncFieldProxy before DecFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = makeIncFieldProxy(subject);
                var decFieldProxy = makeDecFieldProxy(incFieldProxy);
                
                expect(decFieldProxy.a).to.equal(42);
                expect(decFieldProxy.protoFuncNormal()).to.equal(42); //42 = 42 +1 -1
                expect(decFieldProxy.a).to.equal(42);

                expect(subject.a).to.equal(42); //original should be changed
                done();
            });

            it('IncFieldProxy before IncFieldProxy before IncFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = makeIncFieldProxy(subject);
                var incFieldProxy2 = makeIncFieldProxy(incFieldProxy);
                var incFieldProxy3 = makeIncFieldProxy(incFieldProxy2);
                

                expect(incFieldProxy3.a).to.equal(42);
                expect(incFieldProxy3.protoFuncNormal()).to.equal(45); //45 = 42 +1 +1 +1
                expect(incFieldProxy3.a).to.equal(45);

                expect(subject.a).to.equal(45); //original should be changed
                done();
            });

            it('IncFieldProxy before DecFieldProxy before IncFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = makeIncFieldProxy(subject);
                var decFieldProxy = makeDecFieldProxy(incFieldProxy);
                var incFieldProxy2 = makeIncFieldProxy(decFieldProxy);
                

                expect(incFieldProxy2.a).to.equal(42);
                expect(incFieldProxy2.protoFuncNormal()).to.equal(43); //43 = 42 +1 -1 +1
                expect(incFieldProxy2.a).to.equal(43);

                expect(subject.a).to.equal(43); //original should be changed
                done();
            });
        });
        describe('State', function() {  
            it('InvocCounterProxy', function(done) {
                var subject = new Subject();
                var invocCounterProxy = makeInvocCounterProxy(subject);

                expect(invocCounterProxy.a).to.equal(42);
                expect(invocCounterProxy.protoFunc()).to.equal(1);
                expect(invocCounterProxy.a).to.equal(43);
                expect(invocCounterProxy.protoFunc()).to.equal(2);
                expect(invocCounterProxy.a).to.equal(44);
                expect(invocCounterProxy.protoFunc()).to.equal(3);
                expect(invocCounterProxy.a).to.equal(45);
                done();
            });
        });   
        //todo test where 1proxy overwrites a method and chained proxy that overwrites an other methods  
    });
});


