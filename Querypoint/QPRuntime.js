// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  window.Querypoint = window.Querypoint || {};
  /** 
   * A function that runs in the debuggee web page before any other JavaScript
   */
  Querypoint.runtime = function() {

    function initiailizeHiddenGlobalState() {
      window.__qp = {};       // keys are filenames, values are lineTables
      window.__qpTurns = []; // stack of {fnc: <function>, }
      window.__qpIntercepts = {}; // keys are intercepted function names, values functions
    }
    
    function wrapEntryPoint(entryPointFunction) {
      return function() {
        var args = Array.prototype.slice.apply(arguments);
        window.__qpTurns.push({fnc: entryPointFunction, args: args});  
        entryPointFunction(args);
      }
    }

    function interceptEntryPoints() {
      window.__qpIntercepts.addEventListener = window.addEventListener;
      window.addEventListener = function(type, listener, useCapture) {
        window.__qpIntercepts.addEventListener.call(this, type, wrapEntryPoint(listener), useCapture);
      }
    }

    initiailizeHiddenGlobalState()
    interceptEntryPoints();
    console.log("----------------------- Querypoint Runtime Initialized ---------------------------------");
  };

}())