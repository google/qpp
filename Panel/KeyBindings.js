// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Encapsulate keymaster library
// The |commands| functions are keymaster handlers but we'll 
// ignore the arguments.

function KeyBindings(panel_window) {
  // The keymaster library uses global vars |document| so we must
  // compile it in the panel and use it through the panel window global.
  this.win = panel_window;
  this.bindings = this.setDefaults();
}

KeyBindings.prototype = {

  enter: function() {
    this.win.key.setScope('qp');
  },

  exit: function() {
    this.win.key.setScope('all');
  }, 

  setDefaults: function() {
    // Allow keymaster on TEXTAREA for CodeMirror (and INPUT SELECT because)
    this.win.key.filter = function() { return true; }
    // name of QP command -> keymaster string
    return {
      openChainedEditor: 'shift+ctrl+o',
      selectFile: 'ctrl+o',
      saveFile: 'ctrl+s',
    }
  },

  /**
   * @param commands: {object} keys: command names, values: handlers
   */
  apply: function(commands) {
    Object.keys(commands).forEach(function(command) {
      var binding = this.bindings[command];
      if (binding) 
        this.win.key(binding, 'qp', commands[command]);
      else  // developer error
        console.error('No KeyBindings.bindings['+command+']');
    }.bind(this));
  }
};