(function(){

var debug_proxy = false;

function FakeObjectRef(index) {
  this._fake_object_ref = index;
}


function FakeMaker() {
  // Co-indexed
  this._proxiedObjects = [];
  this._proxiesOfObjects = [];

  this._recordedProxiesOfObjects = [];
  this._recording = []; // Number, String, Boolean. Objects are refs to _recordedProxiesOfObjects

  this._proxyPropertyNamePath = [];
}

FakeMaker.prototype = {

  // Operate on the fake, the operations will be recorded.
  makeFake: function(obj) {
    return this._record(this._proxyObject(obj, obj));
  },

  // The record returned as JSON.
  toJSON: function() {
    var jsonableProxiesOfObjects = [];
    // The nubmer of _recordedProxiesOfObjects increases as we prepare them.
    for (var i = 0; i < this._recordedProxiesOfObjects.length; i++) {
      jsonableProxiesOfObjects.push(this._prepareObjectForJSON(this._recordedProxiesOfObjects[i]));
    }
    var fullRecord = {
      objects: jsonableProxiesOfObjects,
      recording: this._recording
    };
    try {
      return JSON.stringify(fullRecord, this._replacer);
    } catch(e) {
      console.error("JSON.stringify FAILS " + e + " Retry item at a time");
      jsonableProxiesOfObjects.forEach(function(jsonableProxiesOfObject) {
        JSON.stringify(jsonableProxiesOfObject);
      });
      this._recording.forEach(function(record) {
        JSON.stringify(record);
      });
    }
  },

  //-------------------------------------------------------------

  _replacer: function(key, value) {
    if (value === Infinity) {
      return {'_fake_': 'Infinity'};
    } else if (Number.isNaN(value)) {
      return {'_fake_': 'NaN'};
    }
    return value;
  },

  // Objects map uniquely to a proxy: create map entry.
  _registerProxyObject: function(obj, proxy) {
    this._proxiedObjects.push(obj);
    this._proxiesOfObjects.push(proxy);
  },

  // Objects map uniquely to a proxy: lookup map entry.
  _lookupProxyObject: function(obj) {
    var index = this._proxiedObjects.indexOf(obj);
    if (debug_proxy) {
      try {
        console.log('_lookupProxyObject: ' + index + ' for ' + obj + 'typeof: ' + (typeof obj));
      } catch (e) {
        console.log('_lookupProxyObject ' + e);
      }
    }
    if (index !== -1)
      return this._proxiesOfObjects[index];
  },

  _ensureRefRecorded: function(obj) {
    var index = this._recordedProxiesOfObjects.indexOf(obj);
    var ref;
    if (index !== -1) {
      ref = new FakeObjectRef(index);
    } else {
      ref = new FakeObjectRef(this._recordedProxiesOfObjects.length);
      this._recordedProxiesOfObjects.push(obj);
    }
    return ref;
  },

  // Append primitives, store objects and append their reference.
  _record: function(value) {
    if (value && typeof value === 'object') {
      this._recording.push(this._ensureRefRecorded(value));
    } else if (typeof value === 'undefined') {
      // we cannot JSON.stringify undefined.
      this._recording.push({'_fake_undefined': undefined});
    } else {
      this._recording.push(value);
    }
    return value;
  },

  _proxyObjectProperty: function(name, proxy, theThis, obj) {
    switch(typeof obj[name]) {
      case 'function': proxy[name] = this._proxyFunction(name, proxy, theThis, obj); break;
      case 'object': proxy[name] = this._proxyObject(obj[name], obj[name]); break;
      default: this._proxyPrimitive(name, proxy, obj); break;
    }
  },

  _proxyObject: function(theThis, obj) {
    if (!obj)
      return obj; // typeof null === 'object'
    return this._lookupProxyObject(obj) || this._createProxyObject(theThis, obj);
  },

  _createProxyObject: function(theThis, obj) {
    var proxy = {};
    this._registerProxyObject(obj, proxy);
    if (debug_proxy)
      console.log("_createProxyObject, building properties");

    Object.getOwnPropertyNames(obj).forEach(function(propertyName){
      // Surprise: the names are duped in eg document
      if (propertyName in proxy)
        return;
      if (this._specialCase(propertyName, proxy, obj)) {
        return;
      }
      this._proxyPropertyNamePath.push(propertyName);
      if (debug_proxy)
        console.log(this._proxyPropertyNamePath.join('.'));
      this._proxyObjectProperty(propertyName, proxy, theThis, obj);
      this._proxyPropertyNamePath.pop();
    }.bind(this));
    if (obj.__proto__)  // Since we are binding functions, we can't reuse prototypes
      proxy.__proto__ = this._createProxyObject(theThis, obj.__proto__);
    return proxy;
  },

  _specialCase: function(propertyName, proxy, obj) {
    if (propertyName === 'mimeTypes' && obj.toString() === "[object Navigator]") {
      console.warn("Fixme, handle special case");
      return true;
    }
    if (propertyName === 'plugins' && obj.toString() === "[object Navigator]") {
      console.warn("Fixme, handle special case");
      return true;
    }

    if (propertyName === 'enabledPlugin') {
      if (this._proxyPropertyNamePath.indexOf(propertyName) !== -1) {
        console.warn("Fixme, handle special case");
        return true;
      }
    }
  },

  _proxyFunction: function(fncName, proxy, theThis, obj) {
    if (fncName === 'querySelector') console.log('_proxyFunction obj: %o theThis: %o', obj, theThis);
    var fakeMaker = this;
    return function() {
      var args = Array.prototype.slice.apply(arguments);
      try {
        var returnValue = obj[fncName].apply(theThis, args);
        switch(typeof returnValue) {
          case 'function': throw new Error("FakeMaker did not expect functions as returnValues");
          case 'object': return fakeMaker._proxyObject(returnValue, returnValue);
          default: return fakeMaker._record(returnValue);
        }
      } catch(e) {
        console.error('_proxyFunction obj:' + obj.constructor.toString() + ' theThis:' + theThis.toString(), e.stack);
      } finally {
        wasCalled = proxy._fakeMaker_proxy_was_called || [];
        wasCalled.push(fncName);
        proxy._fakeMaker_proxy_was_called = wasCalled;
      }
    }
  },

  _proxyPrimitive: function(name, proxy, obj) {
    var fakeMaker = this;
    Object.defineProperty(proxy, name, {
      get: function() {
        return fakeMaker._record(obj[name]);
      }
    });
  },

  _prepareObjectForJSON: function(obj) {
    var jsonable = {};
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      this._replaceObjectsAndFunctions(jsonable, obj, key);
    }.bind(this));
    if (obj.__proto__)
      jsonable['_fake_proto'] = this._prepareObjectForJSON(obj.__proto__);
    return jsonable;
  },

  _replaceObjectsAndFunctions: function(jsonable, obj, key) {
    var value = obj[key];
    console.log("_replaceObjectsAndFunctions " + key, typeof value);
    if (key === '_fakeMaker_proxy_was_called') // drop our secret property on functions.
      return;

    if (value && typeof value === 'object') {
      jsonable[key] = this._ensureRefRecorded(value);
    } else if (typeof value === 'function') {
      var called = obj._fakeMaker_proxy_was_called;
      if (called && called.indexOf(key) !== -1)
        jsonable[key] = {'_fake_function_': key};
      // else drop functions not called.
    } else {
      // Ok this looks like nonsense, but consider:
      // typeof window.document.all === undefined
      // but
      // window.document.all !== undefined
      jsonable[key] = value ? value : undefined;
    }
  },

};


function FakePlayer(json) {
  var fromJSON = JSON.parse(json);
  // Start with the objects containing refs to functions and objects.
  this._recordedProxiesOfObjects = fromJSON.objects;
  this._recordedProxiesOfObjects.forEach(this.refunctionAndRefObjects.bind(this));
  this._recording = fromJSON.recording;
  this._currentReplay = 0;
}

FakePlayer.prototype = {
  startingObject: function () {
    this._currentReplay = 0;
    return this.replay();
  },

  replay: function() {
    var reply = this._recording[this._currentReplay++];
    if (typeof reply === 'object') {
      return this._recordedProxiesOfObjects[reply._fake_object_ref];
    } else {
      return reply;
    }
  },

  refunctionAndRefObjects: function(item) {
    var fakePlayer = this;
    if (typeof item === 'object') {
      if (item._fake_function_) {
        return this.replay.bind(this);
      } else if (item._fake_object_ref) {
        return this._recordedProxiesOfObjects[item._fake_object_ref];
      } else if (item._fake_undefined) {
        return undefined;
      } else {
        // was an object in recording
        Object.keys(item).forEach(function(key) {
          if (key === '_fake_proto') {
            var theProto = fakePlayer.refunctionAndRefObjects(item._fake_proto);
            item.__proto__ = theProto;
            delete item._fake_proto;
          } else if (typeof item[key] === 'object') {
            item[key] = fakePlayer.refunctionAndRefObjects(item[key]);
          } else { // must have been a primitive in recording.
            Object.defineProperty(item, key, {
              get: function() {
                return fakePlayer.replay();
              }
            });
          }
        });
        return item;
      }
    } else {
      return item;
    }
  }
};


// Each test must take care to match calls on proxy with calls on replay

var objWithPrimitive = {foo: 1};

(function testPrimitive() {
  var fakeMaker = new FakeMaker();
  var objWithPrimitiveProxy = fakeMaker.makeFake(objWithPrimitive);
  var json = fakeMaker.toJSON();
  console.log('objWithPrimitive: ', json);
  var fakePlayer = new FakePlayer(json);
  var obj = fakePlayer.startingObject();
  console.assert(objWithPrimitive.foo === obj.foo);
})();

(function testObject() {
  var fakeMaker = new FakeMaker();
  var objWithObj = {bar: objWithPrimitive};
  var objWithObjProxy = fakeMaker.makeFake(objWithObj);
  console.assert(objWithObjProxy.bar.foo === objWithObj.bar.foo);

  var json = fakeMaker.toJSON();
  console.log('objWithObj:',json);
  var fakePlayer = new FakePlayer(json);
  var obj = fakePlayer.startingObject();
  console.assert(objWithObj.bar.foo === obj.bar.foo);
})();

(function testFunction() {
  var fakeMaker = new FakeMaker();
  var objWithFunction = {baz: function() {return 2;}};
  var objWithFunctionProxy = fakeMaker.makeFake(objWithFunction);
  console.assert(objWithFunctionProxy.baz() === objWithFunction.baz());

  var json = fakeMaker.toJSON();
  console.log('objWithFunction:',json);
  var fakePlayer = new FakePlayer(json);
  var obj = fakePlayer.startingObject();
  console.assert(objWithFunction.baz() === obj.baz());
})();

(function testArray() {
  var fakeMaker = new FakeMaker();
  var objWithArrayOfObj = {ary:[{baz: function() {return 3;}}, {bax: function() {return 4}}]};
  var objWithArrayOfObjProxy = fakeMaker.makeFake(objWithArrayOfObj);
  console.assert(objWithArrayOfObj.ary[0].baz() === objWithArrayOfObjProxy.ary[0].baz());
  var json = fakeMaker.toJSON();
  console.log('objWithArrayOfObj', json);
  var fakePlayer = new FakePlayer(json);
  console.assert(fakePlayer.startingObject().ary[0].baz() === objWithArrayOfObj.ary[0].baz());
})();

(function testMethodOnSubObject() {
  var fakeMaker = new FakeMaker();
  var objWithMethodOnSubObject = {foo: {baz: function() {return 3;}}};
  var objWithMethodOnSubObjectProxy = fakeMaker.makeFake(objWithMethodOnSubObject);
  console.assert(objWithMethodOnSubObjectProxy.foo.baz() === objWithMethodOnSubObject.foo.baz());

  var json = fakeMaker.toJSON();
  console.log('objWithMethodOnSubObject:',json);
  var fakePlayer = new FakePlayer(json);
  console.assert(objWithMethodOnSubObject.foo.baz() === fakePlayer.startingObject().foo.baz());
})();

(function testProto() {
  var fakeMaker = new FakeMaker();
  function Foo() {};
  Foo.prototype = {
    baz: function() {
      return 4;
    }
  };
  var objWithPrototype = new Foo();
  var objWithPrototypeProxy = fakeMaker.makeFake(objWithPrototype);
  console.assert(objWithPrototypeProxy.baz() === objWithPrototype.baz());

  var json = fakeMaker.toJSON();
  console.log('objWithPrototype:',json);
  var fakePlayer = new FakePlayer(json);
  console.assert(objWithPrototype.baz() === fakePlayer.startingObject().baz());
})();

console.log("=======  PASS  =======");

(function testWindow() {
  var fakeMaker = new FakeMaker();
  var windowProxy = fakeMaker.makeFake(window);
  console.assert(window.document.querySelector('body') === windowProxy.document.querySelector('body'));
  var json = fakeMaker.toJSON();
  console.log('window', json);
  var fakePlayer = new FakePlayer(json);
  console.assert(window.document.querySelector('body') === fakePlayer.startingObject().document.querySelector('body'))
})();

}())
