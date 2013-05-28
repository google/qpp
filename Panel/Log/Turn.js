// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';   

  var DEBUG = false;

  QuerypointPanel.Turn = function(runtimeData) {
    Object.keys(runtimeData).forEach(function(key){
      this[key] = runtimeData[key];
    }.bind(this));
    console.log("Turn " + runtimeData.turnNumber + " runtimeData", runtimeData);
    
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
      this.registeredEntryPoints.push('Timeout in ' + millis + ' triggers ' + target);
    },

    onAddEventListener: function(eventType, target) {
      this.registeredEntryPoints.push('Listener added to ' + target + ' triggers on ' + eventType);      
    },

    summary: function() {
      var summary = this.functionName + '|' + this.eventType;
      summary += this.targetSelector ? '|' + this.target : '';
      return summary;    
    },

    equivalentTo: function(turn) {
      return (turn.eventType === this.eventType) &&
          (turn.functionName === turn.functionName) &&
          (turn.targetSelector === turn.targetSelector);
    },

  };

}());
