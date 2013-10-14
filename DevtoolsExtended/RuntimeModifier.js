// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// sources sidebar pane with a button to report/control runtime status.

(function(global){
  'use strict';

  var debug = DebugLogger.register('RuntimeModifier', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  function RuntimeModifier(injectedScript, preprocessingScript) {
    this._injectedScript = injectedScript;
    this._preprocessingScript = preprocessingScript;
    DevtoolsExtended.mixinPropertyEvent(this, 'onActivationChanged');
    this._onRuntimeChanged = this._onRuntimeChanged.bind(this);
  }

  RuntimeModifier.prototype = {
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

    _activate: function() {
      if (!this._injectedScript && !this._preprocessingScript)
        throw new Error("No runtime injectedScript or preprocessingScript defined.");

      if (this._injectedScript)
        DevtoolsExtended.InspectedWindow.injectedScript = this._injectedScript;
      if (this._preprocessingScript)
        DevtoolsExtended.InspectedWindow.preprocessingScript = this._preprocessingScript;

      this._activating = true;
      DevtoolsExtended.InspectedWindow.onRuntimeChanged.addListener(this._onRuntimeChanged);

      DevtoolsExtended.InspectedWindow.reload();
    },

    _deactivate: function() {
      DevtoolsExtended.InspectedWindow.injectedScript = "";
      DevtoolsExtended.InspectedWindow.preprocessingScript = "";
      DevtoolsExtended.InspectedWindow.reload();
    },

    _onRuntimeChanged: function() {
      var active = this._active;
      if (this._activating) {
        delete this._activating;
        this._active = true;
      } else {
        this._active = false;
         DevtoolsExtended.InspectedWindow.onRuntimeChanged.removeListener(this._onRuntimeChanged);
      }
      if (this._active !== active)
        this.onActivationChanged.fireListeners(this._active);
    }
  };

  global.DevtoolsExtended = global.DevtoolsExtended || {};
  DevtoolsExtended.RuntimeModifier = RuntimeModifier;

}(this));
