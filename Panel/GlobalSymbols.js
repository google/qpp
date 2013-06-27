 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

/**
 * Collect all the properties of the global object in an array
 * for priming the global symbol table
 */

(function() {

  'use strict';

  // LHS for the compile context of the devtools script preprocessor,
  // RHS for the runtime context of the devtools script preprocessor...
  var global = ('global', eval)('this') || window;
  global.Querypoint = {};
  global.QuerypointPanel = {};
  global.QuerypointModel = {};

}());