// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// Model of the debuggee based on chrome.devtools callback data

(function(global){
  'use strict';

  var debug = DebugLogger.register('InspectedWindow', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  function listenerFeature(propertyName) {
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

  var InspectedWindow = Object.mixin(listenerFeature('onURLChanged'), {

    // Array<chrome.devtools.inspectedWindow.Resource>
    get resources() {
      return this._resources;
    },

    // String
    get url() {
      return this._url;
    },

    set injectedScript(scriptString) {
      console.assert(typeof scriptString === 'string');
      this._injectedScript = scriptString;
    },

    set preprocessingScript(scriptString) {
      console.assert(typeof scriptString === 'string');
      this._preprocessingScript = scriptString;
    },

    reload: function() {
      if (this._injectedScript || this._preprocessingScript)
        this._reloadRuntime();
      else
        chrome.devtools.inspectedWindow.reload();
    },

    monitorNavigation: function() {
      chrome.devtools.network.onNavigated.addListener(this._onURLChanged.bind(this));
      this._onURLChanged();
    },

    monitorResources: function() {
      this._resources = [];
      chrome.devtools.inspectedWindow.onResourceAdded.addListener(this._addResource.bind(this));
      chrome.devtools.inspectedWindow.getResources(function onResources(resources){
        if (debug) console.log("getResources", resources.map(function(resource){return resource.url}));
        resources.forEach(this._addResource.bind(this));
      }.bind(this));
    },

    _reloadRuntime: function() {
      this._loadingRuntime = true;
      var reloadOptions = {
        ignoreCache: true,
        injectedScript:  this._injectedScript,
        preprocessingScript: '(' + this._preprocessingScript + ')'
      };
      if (debug) console.log("reloadOptions ", reloadOptions);
      chrome.devtools.inspectedWindow.reload(reloadOptions);
    },

    _onURLChanged: function(url) {
      this._resources = [];
      if (this._loadingRuntime) { // reloaded by us
        console.assert(url === this._url);
        this._runtimeInstalled = true;
        delete this._loadingRuntime;
      } else {
        if (url === this._url) { // reloaded by user
          if (this._runtimeInstalled)  // force our runtime back, maybe annoying to user?
            this._reloadRuntime();
        } else {  // user moved to new URL
          this._url = url;
          this.onURLChanged.fireListeners(url);
        }
      }

      if (debug)
        console.log("InspectedWindow.onURLChanged " + url + '----------------------------');
    },

    _addResource: function(resource) {
      if (!resource.url)  // I guess these are console evaluations for example.
        return;
      if (debug) console.log("addResource " + resource.url + ' to ' + this._resources.length + " resources");
      this._resources.push(resource);
    },
  });

  global.DevtoolsExtended = global.DevtoolsExtended || {};
  DevtoolsExtended.InspectedWindow = InspectedWindow;

}(this));
