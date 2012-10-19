// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  window.Querypoint = window.Querypoint || {};
  /** 
   * A function that runs in the debuggee web page before any other JavaScript
   */
  Querypoint.runtime = function() {

    var early = true;

    function fireLoad() {
      // So far we cannot transcode synchronously so we miss the 'load' event
      early = false;
      var handlers = window.__qp.earlyEventHandlers['load'];
      handlers.forEach(function(handler){
        handler(window.__qp.loadEvent);
      });
      console.log("Querypoint.runtime: fireLoad complete, fired "+handlers.length+" handlers");
    }
    
    function trace(expr) {
      return expr + '';
    }

    function initiailizeHiddenGlobalState() {
      window.__qp = {
        intercepts: {}, // keys are intercepted function names, values functions
        earlyEventHandlers: {}, // keys are event types, values are arrays of handlers
        turns: [],      // stack of {fnc: <function>, args: []}
        functions: {},  // keys filename, values {<function_ids>: [<activations>]}
        fireLoad: fireLoad,
        trace: trace,
      };      
    }

    function grabLoadEvent() {
      window.addEventListener('load', function(event) {
        window.__qp.loadEvent = event;
      });
    }
    
    function wrapEntryPoint(entryPointFunction) {
      return function() {
        var args = Array.prototype.slice.apply(arguments);
        window.__qp.turns.push({fnc: entryPointFunction, args: args}); 
        window.__qp.turn = window.__qp.turns.length;
        console.log("Turn " + window.__qp.turn + " starts "); 
        entryPointFunction.apply(window, args);  // TODO check |this| maybe use null
        console.log("Turn " + window.__qp.turn + " ends "); 
      }
    }

    function interceptEntryPoints() {
      window.__qp.intercepts.addEventListener = window.addEventListener;
      window.addEventListener = function(type, listener, useCapture) {
        window.__qp.intercepts.addEventListener.call(this, type, wrapEntryPoint(listener), useCapture);
        if (early) {
          var handlers = window.__qp.earlyEventHandlers;
          if (!handlers[type]) {
            handlers[type] = [listener];
          } else {
            handlers[type].push(listener);
          }  
        }        
      }

      window.__qp.intercepts.Node = {prototype: {addEventListener: window.Node.prototype.addEventListener}};
      window.Node.prototype.addEventListener = function(type, listener, useCapture) {
        window.__qp.intercepts.Node.prototype.addEventListener.call(this, type, wrapEntryPoint(listener), useCapture);
      }
    }

    initiailizeHiddenGlobalState();
    grabLoadEvent();
    interceptEntryPoints();
    wrapEntryPoint(function andWeBegin() {
      console.log("----------------------- Querypoint Runtime Initialized ---------------------------------");
      console.log("window.__qp: %o", window.__qp);    
    }());
  };

}())