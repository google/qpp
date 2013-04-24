// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';   

  var DEBUG = false;

  QuerypointPanel.Turn = function(initialValues) {
    Object.keys(initialValues).forEach(function(key){
      this[key] = initialValues[key];
    }.bind(this));
    this.addedEvents = [];

      // If previousTurn is a number, make the structure point to the respective turn and add the current turn to the previos turn's fired events list
      // If there is no previous turn just set the previousTurn to null
      if (this._currentEvent.previousTurn !== 'undefined' && this._currentEvent.previousTurn !== '-1') {
          var previousTurn= this.currentReload.turns()[parseInt(this._currentEvent.previousTurn) - 1];
          this._currentEvent.previousTurn = previousTurn; 
          previousTurn.event.firedEvents.push(this._turn);
      } else {
          this._currentEvent.previousTurn = null;
      }
    },
  }

  QuerypointPanel.Turn.prototype = { 
    onSetTimeout: function(millis, target) {
      this.addedEvents.push('Timeout in ' + millis + ' triggers ' + target);
    },

    onAddEventListener: function(eventType, target) {
      this.addedEvents.push('Listener added to ' + target + ' triggers on ' + eventType);      
    },

    detail: function() {
      // Turn detail is a string summary of the current event
      var turnDetail = this._currentEvent.functionName + '|' + this._currentEvent.eventType;
      if (this._currentEvent.target !== 'undefined') 
          turnDetail += '|' + this._currentEvent.target;
      return turnDetail;    
    }
  };

}());
