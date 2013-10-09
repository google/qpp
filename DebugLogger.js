// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  var global = this;  // don't use strict in this file.

  if (window.DebugLogger && window.DebugLogger.hasOwnProperty('register'))
    return;  // our work is done here

  window.DebugLogger = window.DebugLogger || [];

  var debugFlags = window.DebugLogger.slice(0);
  var debugging = !!debugFlags.length; // activate this service.

  global.DebugLogger = {
    debuggables: {},
    flags: {},

    register: function(name, callback) {
      this.debuggables[name] = callback;
      var flag = false;
      if (this.flags.hasOwnProperty(name)) {
        flag = this.flags[name];
        callback(flag);
        delete this.flags[name];
      }
      if (debugging) // Signal Testrunner
        console.log("InspectorTest.info: " + name + ' ' + callback());
      return flag;
    },

    set: function(name, bool) {
      if (this.debuggables.hasOwnProperty(name)) {
        this.debuggables[name].call(this, bool);
      } else {
        this.flags[name] = bool;
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
  };

  debugFlags.forEach(function(name){
    DebugLogger.set(name, true);
  });

}());