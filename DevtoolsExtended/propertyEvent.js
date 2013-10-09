// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// Object.mixin(DevtoolsExtended.propertyEvent('propName', {}) to add
// {propName:{addListener, removeLIstener, fireListener}}

(function(global){
  'use strict';

  var debug = DebugLogger.register('propertyEvent', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  function propertyEvent(propertyName) {
    var mixMe = {};

    mixMe[propertyName] = {

      addListener: function(listenerCallback) {
        if (typeof listenerCallback !== "function")
            throw "addListener: listenerCallback must be a function";
        this._listeners = this._listeners || [];
        this._listeners.push(listenerCallback);
      },

      removeListener: function(listenerCallback) {
        var listeners = this._listeners;

        for (var i = 0; i < listeners.length; ++i) {
            if (listeners[i] === listenerCallback) {
                listeners.splice(i, 1);
                break;
            }
        }
      },

      fireListeners: function()
      {
          var listeners = this._listeners.slice();
          for (var i = 0; i < listeners.length; ++i)
              listeners[i].apply(null, arguments);
      },

    };
    return mixMe;
  }

  global.DevtoolsExtended = global.DevtoolsExtended || {};
  DevtoolsExtended.propertyEvent = propertyEvent;

}(this));
