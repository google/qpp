// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';
 
  var global = this;
  var slice = [].slice;

  var Console = {
    _messages: [],
 
    log: function() {
      this._messages.push({method: 'log', params: slice.apply(arguments)});
    },
    warn: function() {
      this._messages.push({method: 'warn', params: slice.apply(arguments)});
    },
    info: function() {
      this._messages.push({method: 'info', params: slice.apply(arguments)});
    },
    error: function() {
      throw new Error(arguments[0]);
      //this._messages.push({method: 'error', params: slice.apply(arguments)});
    },
    assert: function() {
      if (!arguments[0]) throw new Error("Assertion failed");
    },

    dump: function() {
      var consoleSource = this._messages.map(function(message){
        var stringified =  message.params.map(function(param){
          return param.toString();
        });
        return 'console.' + message.method + '(\"' + stringified.join(',') + '\");';
      });
      return '' + consoleSource.join('\n');
    }
  };

  global.console = Console;

}.call(this));

console = this.console;