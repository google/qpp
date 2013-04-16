// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  QuerypointPanel.addEventFunctions = function(prototype) {
    
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
      var count = this._getEventHandlers(eventName).push(handler);
      this.dispatch('onListenerChange', {eventName: eventName, count: count});
    }
    
    prototype.removeListener = function(eventName, handler) {
      var handlers = this._getEventHandlers(eventName)
      var index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.dispatch('onListenerChange', {eventName: eventName, count: handlers.length});
      }  
    }
    
    prototype.hasListener = function(eventName) {
      return !!this._getEventHandlers(eventName).length;
    }

  };

  QuerypointPanel.addEventFunctions.test = function() {
    function TestType() {}
    TestType.prototype = {};

    QuerypointPanel.addEventFunctions(TestType.prototype);

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

}());