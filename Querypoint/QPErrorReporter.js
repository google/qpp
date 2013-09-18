// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  'use strict';

  var ErrorReporter = traceur.util.ErrorReporter;

  /**
   * An error reporter that is used with the tests. It doesn't output anything
   * to the console but it does keep track of reported errors
   */
  function QPErrorReporter() {
    this.errors = [];
  }

  QPErrorReporter.prototype = {
    __proto__: ErrorReporter.prototype,
    reportMessageInternal: function(location, kind, format, args) {
      var url = location.source.name + ':' + location.line + ':' + location.column;
      console.error([url + ': ' +format].concat(args));
    },

    hasMatchingError: function(expected) {
      return this.errors.some(function(error) {
        return error.indexOf(expected) !== -1;
      });
    }
  };

  Querypoint.QPErrorReporter = QPErrorReporter;

}());
