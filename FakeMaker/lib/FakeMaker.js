(function(){
  
function defunction(item) {
    if (typeof item === 'object') {
      Object.keys(item).forEach(function(key) {
        if (typeof item[key] === 'function')
          item[key] = {'_faker_maker_': key};
        else 
          item[key] = defunction(item[key]);
      });
      if (item.__proto__)
        item.__proto__ = defunction(item.__proto__);
    } else {
      console.assert(typeof item !== 'function');
    }
    return item;
  }

function FakeMaker() {
  // Co-indexed
  this._proxiedObjects = [];
  this._proxies = [];

  this._recording = [];
  this._currentReplay = 0;

  this.working = [];
}

FakeMaker.prototype = {
  makeFake: function(obj) {
    return this.record(this.proxyObject(obj));
  },

  registerProxyObject: function(obj, proxy) {
    this._proxiedObjects.push(obj);
    this._proxies.push(proxy);
  },

  lookupProxyObject: function(obj) {
    var index = this._proxiedObjects.indexOf(obj);
    console.log('lookupProxyObject: ' + index + ' for ' + obj + 'typeof: ' + (typeof obj))
    if (index !== -1)
      return this._proxies[index];
  },

  record: function(value) {
    this._recording.push(value);
    return value;
  },
  
  recording: function() {
    return this._recording.map(defunction);
  },

  replay: function() {
    return this._recording[this._currentReplay++];
  },

  proxyAny: function(name, proxy, theThis) {
    switch(typeof theThis[name]) {
      case 'function': proxy[name] = this.proxyFunction(name, proxy, theThis); break;
      case 'object': proxy[name] = this.proxyObject(theThis[name]); break;
      default: this.proxyPrimitive(name, proxy, theThis); break;
    }
  },

  proxyObject: function(obj) {
    if (!obj)
      return obj; // typeof null === 'object'
    return this.lookupProxyObject(obj) || this.createProxyObject(obj);
  },

  createProxyObject: function(obj) {
    var proxy = {};
    this.registerProxyObject(obj, proxy);
    Object.getOwnPropertyNames(obj).forEach(function(propertyName){
      this.working.push(propertyName);
      console.log(this.working.join(','));
      this.proxyAny(propertyName, proxy, obj);
      this.working.pop();
    }.bind(this));
    if (obj.__proto__)
      proxy.__proto__ = this.proxyObject(obj.__proto__);
    return proxy;
  },

  proxyFunction: function(fncName, proxy, theThis) {
    var fakeMaker = this;
    return function() {
      var args = Array.prototype.slice.apply(arguments);
      try {
        var returnValue = theThis[fncName].apply(theThis, arguments);
        switch(typeof returnValue) {
          case 'function': throw new Error("FakeMaker did not expect functions as returnValues");
          case 'object': return fakeMaker.recordAndProxyObject(returnValue);
          default: return fakeMaker.record(returnValue);
        }
      } catch(exc) {
        
      } finally {
        wasCalled = proxy._fakerMaker_proxy_was_callled || [];
        wasCalled.push(fncName);
        proxy._fakerMaker_proxy_was_callled = wasCalled;
      }
    }
  },

  proxyPrimitive: function(name, proxy, theThis) {
    var fakeMaker = this;
    Object.defineProperty(proxy, name, {
      get: function() {
        return fakeMaker.record(theThis[name]);
      }
    });
  }
};

var fakeMaker = new FakeMaker();

var objWithPrimitive = {foo: 1};
var primitiveProxy = fakeMaker.proxyObject(objWithPrimitive);
console.assert(primitiveProxy.foo === objWithPrimitive.foo);
console.assert(fakeMaker.recording().length === 1);

fakeMaker = new FakeMaker();
var objWithObj = {bar: objWithPrimitive};
var objProxy = fakeMaker.proxyObject(objWithObj);
console.assert(objProxy.bar.foo === objWithObj.bar.foo);
console.assert(fakeMaker.recording().length === 1);

fakeMaker = new FakeMaker();
var objWithFunction = {baz: function() {return 2;}};
var objWithFunctionProxy = fakeMaker.makeFake(objWithFunction);
console.assert(objWithFunctionProxy.baz() === objWithFunction.baz());
console.assert(fakeMaker.recording().length === 2);
var actual = fakeMaker.recording();
var expected = [2];
actual.forEach(function(record, index) {
  console.assert(record === expected[index]);
});

var json = JSON.stringify(defunction(actual));
console.assert(json === "[2]");
console.log("=======  PASS  =======")

}())
