// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.Querypoint = window.Querypoint || {};

  Querypoint.addEventFunctions = function(prototype) {
    
    prototype._getEventHandlers = function(eventName) {
      this.eventHandlers = this.eventHandlers || {};
      this.eventHandlers[eventName] = this.eventHandlers[eventName]  || [];
      return this.eventHandlers[eventName];
    }

    prototype.dispatch = function(eventName, eventData) {
      this._getEventHandlers(eventName).forEach(function(handler) {
        handler.call(this, eventData);
      });
    }

    prototype.addListener = function(eventName, handler) {
      this._getEventHandlers(eventName).push(handler);
    }
    
    prototype.removeListener = function(eventName, handler) {
      var handlers = this._getEventHandlers(eventName)
      var index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }  
    }

  };

  Querypoint.addEventFunctions.test = function() {
    function TestType() {}
    TestType.prototype = {};

    Querypoint.addEventFunctions(TestType.prototype);

    var aTest = new TestType();
    var testString = "been tested";
    function aTestHandler(event) {
      aTest.events = [event];
    }
    aTest.addListener('onTest', aTestHandler);
    aTest.dispatch('onTest', testString);
    aTest.removeListener('onTest', aTestHandler);
    aTest.dispatch('onTest', testString);

    return (
      aTest.events && 
      aTest.events.length === 1 && 
      aTest.events[0] === testString
    );
  };

  if (Querypoint.addEventFunctions.test()) {
    console.log("Querypoint.addEventFunctions.test()");
  } else {
    console.error("Querypoint.addEventFunctions.test()");
  }

}());