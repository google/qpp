 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

/**
 * Collect all the properties of the global object in an array
 * for priming the global symbol table
 */

(function() {

  var global = ('global', eval)('this');

  var globalSymbols = {};

  var object = global;
  while (object) {
    Object.getOwnPropertyNames(object).forEach(function(name) {
      globalSymbols[name] = 'global'; 
    });
    object = Object.getPrototypeOf(object);
  }

  window.Querypoint = {globalSymbols: globalSymbols};

}());