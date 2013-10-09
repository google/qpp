// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// Model of the debuggee based on chrome.devtools callback data

// requires DebugLogger, mixinPropertyEvent

(function(global){
  'use strict';

  var debug = DebugLogger.register('InspectedWindow', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  var InspectedWindow = {

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
      chrome.devtools.network.onNavigated.addListener(this._checkURLChanged.bind(this));
      chrome.devtools.inspectedWindow.eval('window.location.href', function(url) {
        this._checkURLChanged(url);
      }.bind(this));
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
        injectedScript:  this._injectedScript || undefined,
        preprocessingScript: this._preprocessingScript ? '(' + this._preprocessingScript + ')' : undefined
      };
      if (debug) console.log("reloadOptions ", reloadOptions);
      chrome.devtools.inspectedWindow.reload(reloadOptions);
    },

    _checkURLChanged: function(url) {
      this._resources = [];
      if (this._loadingRuntime) { // reloaded by our function
        console.assert(url === this._url);
        this._checkRuntimeInstalled();
        delete this._loadingRuntime;
      } else {
        if (url !== this._url) {  // user moved to new URL
          this._url = url;
          this.onURLChanged.fireListeners(url);
        }
        if (this._runtimeInstalled)  // force our runtime back, maybe annoying to user?
          this._reloadRuntime();
      }

      if (debug)
        console.log("InspectedWindow.onURLChanged " + url + '----------------------------');
    },

    _checkRuntimeInstalled: function() {
      var installedNewRuntime = this._injectedScript || this._preprocessingScript;
      if (this._runtimeInstalled && !installedNewRuntime) {
        this._runtimeInstalled = false;
        this.onRuntimeChanged.fireListeners(this._runtimeInstalled);
      } else if (!this._runtimeInstalled && installedNewRuntime) {
        this._runtimeInstalled = true;
        this.onRuntimeChanged.fireListeners(this._runtimeInstalled);
      }  // else no change
    },

    _addResource: function(resource) {
      if (!resource.url)  // I guess these are console evaluations for example.
        return;
      if (debug) console.log("addResource " + resource.url + ' to ' + this._resources.length + " resources");
      this._resources.push(resource);
    },
  };

  InspectedWindow = DevtoolsExtended.mixinPropertyEvent(InspectedWindow, 'onURLChanged');
  InspectedWindow = DevtoolsExtended.mixinPropertyEvent(InspectedWindow, 'onRuntimeChanged');

  DevtoolsExtended.InspectedWindow = InspectedWindow;

}(this));
