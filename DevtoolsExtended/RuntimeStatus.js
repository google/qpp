// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// sources sidebar pane with a button to report/control runtime status.

(function(global){
  'use strict';

  var debug = DebugLogger.register('RuntimeStatus', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  function RuntimeStatus(featureName, injectedScript, preprocessingScript) {
    this._featureName = featureName;
    this._injectedScript = injectedScript;
    this._preprocessingScript = preprocessingScript;
    this._receiveActivationRequest = this._receiveActivationRequest.bind(this)
    this._createUI(featureName);
  }

  RuntimeStatus.prototype = {
    get active() {
      return this._active;
    },

    activate: function() {
      if (!this._active)
        this._activate();
    },

    deactivate: function() {
      if (this._active)
        this._deactivate();
    },

    set injectedScript(scriptString) {
      console.assert(typeof scriptString === 'string');
      this._injectedScript = scriptString;
    },

    set preprocessingScript(scriptString) {
      console.assert(typeof scriptString === 'string');
      this._preprocessingScript = scriptString;
    },

    // For derived class overrides
    get pageURL() {
      return "DevtoolsExtended/RuntimeStatusPage.html";
    },

    get pageHeight() {
      return "26px";
    },

    _createUI: function(featureName) {
      var runtimeStatus = this;
      chrome.devtools.panels.sources.createSidebarPane(featureName, function(extensionPane) {
        extensionPane.setPage(runtimeStatus.pageURL);
        extensionPane.setHeight(runtimeStatus.pageHeight);
        extensionPane.onShown.addListener(function(win) {
          runtimeStatus._onExtensionPaneWindow(win)
        });
      });
    },

    _onExtensionPaneWindow: function(win) {
      win.addEventListener('message', this._receiveActivationRequest);
      var runtimeStatus = this;
      this._sendActivationStatus = function(runtimeActive) {
        var messageObject = {runtimeActive: runtimeActive};
        win.postMessage(JSON.stringify(messageObject), '*');
        runtimeStatus._active = !!runtimeActive;
      };
      DevtoolsExtended.InspectedWindow.onRuntimeChanged.addListener(this._sendActivationStatus);

      this._sendActivationStatus(DevtoolsExtended.InspectedWindow.active);
      DevtoolsExtended.InspectedWindow.monitorNavigation();
    },

    _receiveActivationRequest: function(event) {
      var json = event.data;
      var messageObject = JSON.parse(json);
      if ('activateRuntime' in messageObject) {
        if (messageObject.activateRuntime)
          this.activate();
        else
          this.deactivate();
      }
    },

    _activate: function() {
      if (!this._injectedScript && !this._preprocessingScript)
        throw new Error("No runtime injectedScript or preprocessingScript defined.");

      if (this._injectedScript)
        DevtoolsExtended.InspectedWindow.injectedScript = this._injectedScript;
      if (this._preprocessingScript)
        DevtoolsExtended.InspectedWindow.preprocessingScript = this._preprocessingScript;

      DevtoolsExtended.InspectedWindow.reload();
    },

    _deactivate: function() {
      DevtoolsExtended.InspectedWindow.injectedScript = "";
      DevtoolsExtended.InspectedWindow.preprocessingScript = "";
      DevtoolsExtended.InspectedWindow.reload();
    },
  };


  global.DevtoolsExtended = global.DevtoolsExtended || {};
  DevtoolsExtended.RuntimeStatus = RuntimeStatus;

}(this));
