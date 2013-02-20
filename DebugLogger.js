// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  var global = this;  // don't use strict in this file.

  var debug = window.DebugLogger; // activate this service.

  global.DebugLogger = {
    debuggables: {},

    register: function(name, callback) {
      this.debuggables[name] = callback;
      if (debug) console.log("InspectorTest.info: " + name + ' ' + callback());
      return false;
    },

    set: function(name, bool) {
      if (bool && !debug && name !== 'DebugLogger') 
        console.error('DebugLogger: DebugLogger must be set to debug before any flags');

      if (this.debuggables.hasOwnProperty(name)) {
        this.debuggables[name].call(this, bool);  
      } else {
        console.warn("DebugLogger.set, no registration at " + name + " in " + window.location.pathname);
      }
    },

    settings: function() {
      return Object.keys(this.debuggables).map(function(name) {
        return {
          name: name, 
          value: this.debuggables[name]()
        }
      }.bind(this));
    }
  }

}());