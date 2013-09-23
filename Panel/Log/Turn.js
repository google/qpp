// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('Turn', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.EntryPointRegistration = function() {}
  QuerypointPanel.EntryPointRegistration.prototype = {
    summary: function() {
      throw new Error('Implement me');
    }
  };

  QuerypointPanel.SetTimeoutRegistration = function(millis, targetFnc) {
    this._millis = millis;
    this._targetFnc = targetFnc;
  }

  QuerypointPanel.SetTimeoutRegistration.prototype = {
    summary: function() {
      return 'Timeout in ' + this._millis + ' triggers ' + this._targetFnc;
    }
  };

  QuerypointPanel.AddEventListenerRegistration = function(eventType, targetFnc, bubbles) {
    this._eventType = eventType;
    this._targetFnc = targetFnc;
    this._bubbles = bubbles;
  }

  QuerypointPanel.SetTimeoutRegistration.prototype = {
    summary: function() {
      return 'Listener added to ' + this._targetFnc + ' triggers on ' + this._eventType;
    }
  };

  // Model of a JavaScript event 'turn', one synchronous call stack.
  // Each turn has an entry point function, typically an event listener
  // with a target element represented by a selector and an event type.
  // All turns have a 'registration' turn that put the entry point into play,
  // eg called addEventListener passing the entry point.

  QuerypointPanel.Turn = function(loadNumber, runtimeData) {
    Object.keys(runtimeData).forEach(function(key){
      this[key] = runtimeData[key];
    }.bind(this));
    if (debug) console.log("Turn " + runtimeData.turnNumber + " runtimeData", runtimeData);

    this.loadNumber = loadNumber;
    this.turnNumber = runtimeData.turnNumber;
    this.eventType = runtimeData.eventType;
    this.functionName = runtimeData.functionName;
    this.filename = runtimeData.filename;
    this.targetSelector = runtimeData.targetSelector;
    this.registrationTurnNumber = runtimeData.registrationTurnNumber;

    this.registeredEntryPoints = [];
    this.messages = ko.observableArray();
  }

  QuerypointPanel.Turn.prototype = {
    onSetTimeout: function(millis, target) {
      this.registeredEntryPoints.push(new QuerypointPanel.SetTimeoutRegistration(millis, target));
    },

    onAddEventListener: function(eventType, target) {
      this.registeredEntryPoints.push(new QuerypointPanel.AddEventListenerRegistration(eventType, target));
    },

    summary: function() {
      var summary = this.functionName + '|' + this.eventType;
      summary += this.targetSelector ? '|' + this.targetSelector : '';
      return summary;
    },

    equivalentTo: function(turn) {
      return (turn.eventType === this.eventType) &&
          (turn.functionName === turn.functionName) &&
          (turn.targetSelector === turn.targetSelector);
    },

  };

}());
