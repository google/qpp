(function(){

function defunction(item) {
    if (item && typeof item === 'object') {
      var called = item._fakeMaker_proxy_was_called;
      delete item._fakeMaker_proxy_was_called;
      Object.keys(item).forEach(function(key) {
        if (typeof item[key] === 'function') {
          if(called && called.indexOf(key) !== -1)
            item[key] = {'_faker_maker_': key};
        } else {
          item[key] = defunction(item[key]);
        }
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
  this._currentPath = [];
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
    try {
      console.log('lookupProxyObject: ' + index + ' for ' + obj + 'typeof: ' + (typeof obj));
    } catch (e) {
      console.log('lookupProxyObject ' + e);
    }
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
    console.log("createProxyObject, building properties");
    Object.getOwnPropertyNames(obj).forEach(function(propertyName){
      // Surprise: the names are duped in eg document
      if (propertyName in proxy)
        return;
      if (this._specialCase(propertyName, proxy, obj)) {
        return;
      }
      this._currentPath.push(propertyName);
      console.log(this._currentPath.join('.'));
      this.proxyAny(propertyName, proxy, obj);
      this._currentPath.pop();
    }.bind(this));
    if (obj.__proto__)
      proxy.__proto__ = this.proxyObject(obj.__proto__);
    return proxy;
  },

  _specialCase: function(propertyName, proxy, obj) {
    if (propertyName === 'enabledPlugin') {
      if (this._currentPath.indexOf(propertyName) !== -1) {
        return true;
      }
    }
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
        wasCalled = proxy._fakeMaker_proxy_was_called || [];
        wasCalled.push(fncName);
        proxy._fakeMaker_proxy_was_called = wasCalled;
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
var expected = [{baz: {'_faker_maker_': 'baz'}}, 2];
actual.forEach(function(record, index) {
  console.assert(typeof record === typeof expected[index]);
});

var json = JSON.stringify(defunction(actual));
console.assert(json === '[{"baz":{"_faker_maker_":"baz"}},2]');


function FakePlayer(json) {
  var ary = JSON.parse(json);
  this._recording = ary.map(this.refunction.bind(this));
  this._currentReplay = 0;
}

FakePlayer.prototype = {
  startingObject: function () {
    this._currentReplay = 0;
    return this.replay();
  },

  replay: function() {
    return this._recording[this._currentReplay++];
  },

  refunction: function(item) {
    var fakePlayer = this;
    if (typeof item === 'object') {
      if (item._faker_maker_) {
        return this.replay.bind(this);
      } else {
        Object.keys(item).forEach(function(key) {
          item[key] = fakePlayer.refunction(item[key]);
        });
        return item;
      }
    } else {
      return item;
    }
  }
};

fakePlayer = new FakeMaker();
var objWitArrayOfObj = {ary:[{baz: function() {return 3;}}, {bax: function() {return 4}}]};
var objWitArrayOfObjProxy = fakeMaker.makeFake(objWitArrayOfObj);

var fakePlayer = new FakePlayer(json);
console.assert(fakePlayer.startingObject().baz() === objWithFunction.baz());
console.log("=======  PASS  =======");

fakeMaker = new FakeMaker();
var windowProxy = fakeMaker.makeFake(window);
json = JSON.stringify(defunction(windowProxy));
console.log(json);
}())
