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
    this._runtimeModifier = new DevtoolsExtended.RuntimeModifier(injectedScript, preprocessingScript);

    this._createUI(featureName);
  }

  RuntimeStatus.prototype = {

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
      window.addEventListener('message', this._receiveActivationRequest.bind(this, win));
      var runtimeStatus = this;
      this._sendActivationStatus = function(runtimeActive) {
        var messageObject = {runtimeActive: !!runtimeActive};
        win.postMessage(JSON.stringify(messageObject), '*');
        runtimeStatus._active = !!runtimeActive;
      };
      this._runtimeModifier.onActivationChanged.addListener(this._sendActivationStatus);

      this._sendActivationStatus(false);
    },

    _receiveActivationRequest: function(win, event) {
      if (win !== event.source)
        return;
      var json = event.data;
      var messageObject = JSON.parse(json);
      if ('activateRuntime' in messageObject) {
        if (messageObject.activateRuntime)
          this._activate();
        else
          this._deactivate();
      }
    },

    _activate: function() {
      this._runtimeModifier.activate();
    },

    _deactivate: function() {
      this._runtimeModifier.deactivate();
    },
  };

  global.DevtoolsExtended = global.DevtoolsExtended || {};
  DevtoolsExtended.RuntimeStatus = RuntimeStatus;

}(this));
