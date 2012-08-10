// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPCompiler = QPCompiler || {};

QPCompiler.ErrorReporter  = (function() {
  'use strict';

  var ErrorReporter = traceur.util.ErrorReporter;

  /**
   * An error reporter that is used with the tests. It doesn't output anything
   * to the console but it does keep track of reported errors
   */
  function QPCompilerErrorReporter() {
    this.errors = [];
  }

  QPCompilerErrorReporter.prototype = traceur.createObject(
      ErrorReporter.prototype, {
    reportMessageInternal: function(location, kind, format, args) {
      var url = location.source.name + ':' + location.line + ':' + location.column;  
      console[kind].apply(console, [url + ': ' +format].concat(args));
    },

    hasMatchingError: function(expected) {
      return this.errors.some(function(error) {
        return error.indexOf(expected) !== -1;
      });
    }
  });

  return QPCompilerErrorReporter;
  
}());
