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
      var turnDetail = this.functionName + '|' + this.eventType;
      if (this.target !== 'undefined') 
          turnDetail += '|' + this.target;
      return turnDetail;    
    }
  };

}());
