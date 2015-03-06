'use strict';
var Proxy = require('./code.js'),
    assert = require("assert"),
    expect = require('chai').expect;

//////////////////////////////////////////////////////////////////
var Subject = function(){
    this.a = 42;
    this.func = function(){ 
        console.log('CALLING', this.a)
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

//A proxy that does nothing, just delegates the call.
var NoOpProxy = function(target){
    return new Proxy.JSProxy(target, DeactivateProxy.handler);           
};    

NoOpProxy.handler = {
        protoFunc: function(originalCall, args, context){
            return originalCall.apply(context, args);
        }
    };

//////////////////////////////////////////////////////////////////    

//A proxy that drops the operation and not executes the call.
var DropOpProxy = function(target){
    return new Proxy.JSProxy(target, DropOpProxy.handler);           
};


DropOpProxy.handler = {
        protoFunc: function(originalCall, args, context){
            return context.a;// we bypass the call and just return the unincremented number
        }
    };

//////////////////////////////////////////////////////////////////

//
var IncFieldProxy = function(target){
    return new Proxy.JSProxy(target, IncFieldProxy.handler);           
};


IncFieldProxy.handler = {
        protoFuncNormal: function(originalCall, args, context, subject){
            subject.a++;
            return originalCall.apply(context, args);
        }
    };

//
var DecFieldProxy = function(target){
    return new Proxy.JSProxy(target, DecFieldProxy.handler);           
};


DecFieldProxy.handler = {
        protoFuncNormal: function(originalCall, args, context, subject){
             //console.log(context.a)
            subject.a--;
            // console.log(context.a)
            return originalCall.apply(context, args);
        }
    };    

//////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////

describe('proxy.js tests', function() {
    describe('Inheritance Proxy', function() {
        describe('Single', function() {
            it('noOpProxy', function(done) {
                var subject = new Subject();
                var noOpProxy = Proxy.makeJSProxy(subject, NoOpProxy.handler);
                
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

                done();
            }); 
            
            it('dropOpProxy', function(done) {
                var subject = new Subject();
                var dropOpProxy = Proxy.makeJSProxy(subject, DropOpProxy.handler);
                
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

                done();
            });
        });     
        
        describe('Double', function() {
            it('noOpProxy', function(done) {
                var subject = new Subject();
                var noOpProxy1 = Proxy.makeJSProxy(subject, NoOpProxy.handler);
                var noOpProxy2 = Proxy.makeJSProxy(noOpProxy1, NoOpProxy.handler);
                
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

                done();
            });

            it('dropOpProxy', function(done) {
                var subject = new Subject();
                var dropOpProxy1 = Proxy.makeJSProxy(subject, DropOpProxy.handler);
                var dropOpProxy2 = Proxy.makeJSProxy(dropOpProxy1, DropOpProxy.handler);
                
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

                done();
            });   
        }); 

        describe('Chaining', function() {
            it('IncFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = Proxy.makeJSProxy(subject, IncFieldProxy.handler);
                
                expect(incFieldProxy.a).to.equal(42);
                expect(incFieldProxy.func()).to.equal(42);
                expect(incFieldProxy.a).to.equal(43);

                expect(incFieldProxy.protoFuncNormal()).to.equal(44);
                expect(incFieldProxy.a).to.equal(44);

                done();
            }); 

            it('DecFieldProxy', function(done) {
                var subject = new Subject();
                var decFieldProxy = Proxy.makeJSProxy(subject, DecFieldProxy.handler);
                
                expect(decFieldProxy.a).to.equal(42);
                expect(decFieldProxy.func()).to.equal(42);
                expect(decFieldProxy.a).to.equal(43);

                expect(decFieldProxy.protoFuncNormal()).to.equal(42);
                expect(decFieldProxy.a).to.equal(42);

                done();
            });

            it('DecFieldProxy before IncFieldProxy', function(done) {
                var subject = new Subject();
                var decFieldProxy = Proxy.makeJSProxy(subject, DecFieldProxy.handler);
                var incFieldProxy = Proxy.makeJSProxy(decFieldProxy, IncFieldProxy.handler);
                

                expect(incFieldProxy.a).to.equal(42);
                expect(incFieldProxy.protoFuncNormal()).to.equal(42); //42 = 42 -1 +1
                expect(incFieldProxy.a).to.equal(42);

                expect(subject.a).to.equal(42); //original should be changed

                done();
            });

            it('IncFieldProxy before DecFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = Proxy.makeJSProxy(subject, IncFieldProxy.handler);
                var decFieldProxy = Proxy.makeJSProxy(incFieldProxy, DecFieldProxy.handler);
                

                expect(decFieldProxy.a).to.equal(42);
                expect(decFieldProxy.protoFuncNormal()).to.equal(42); //42 = 42 +1 -1
                expect(decFieldProxy.a).to.equal(42);

                expect(subject.a).to.equal(42); //original should be changed

                done();
            });

            it('IncFieldProxy before IncFieldProxy before IncFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = Proxy.makeJSProxy(subject, IncFieldProxy.handler);
                var incFieldProxy2 = Proxy.makeJSProxy(incFieldProxy, IncFieldProxy.handler);
                var incFieldProxy3 = Proxy.makeJSProxy(incFieldProxy2, IncFieldProxy.handler);
                

                expect(incFieldProxy3.a).to.equal(42);
                expect(incFieldProxy3.protoFuncNormal()).to.equal(45); //45 = 42 +1 +1 +1
                expect(incFieldProxy3.a).to.equal(45);

                expect(subject.a).to.equal(45); //original should be changed

                done();
            });

            it('IncFieldProxy before DecFieldProxy before IncFieldProxy', function(done) {
                var subject = new Subject();
                var incFieldProxy = Proxy.makeJSProxy(subject, IncFieldProxy.handler);
                var decFieldProxy = Proxy.makeJSProxy(incFieldProxy, DecFieldProxy.handler);
                var incFieldProxy2 = Proxy.makeJSProxy(decFieldProxy, IncFieldProxy.handler);
                

                expect(incFieldProxy2.a).to.equal(42);
                expect(incFieldProxy2.protoFuncNormal()).to.equal(43); //43 = 42 +1 -1 +1
                expect(incFieldProxy2.a).to.equal(43);

                expect(subject.a).to.equal(43); //original should be changed
                
                done();
            });
        });       
    });
});