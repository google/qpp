// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  var global = this;

  global.DebugLogger = {
    debuggables: {},

    register: function(name, callback) {
      this.debuggables[name] = callback;
      console.log("InspectorTest.info: " + name + ' ' + callback());
    },

    set: function(name, bool) {
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