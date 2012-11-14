// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  window.Querypoint = window.Querypoint || {};
  /** 
   * A function that runs in the debuggee web page before any other JavaScript
   */
     function define__qp() {

    var early = true;

    function fireLoad() {
      try {
        // So far we cannot transcode synchronously so we miss the 'load' event
        early = false;
        var handlers = window.__qp.earlyEventHandlers['load'];
        handlers.forEach(function(handler){
          handler(window.__qp.loadEvent);
        });
        console.log("Querypoint.runtime: fireLoad complete, fired "+handlers.length+" handlers");
        return handlers.length;
      } catch(exc) {
        console.error("Querypoint.runtime fireLoad fails "+exc, exc.stack);
        return exc.toString();
      }

    }
    
    function trace(expr) {
      return expr + '';
    }

    function initializeHiddenGlobalState() {
      window.__qp = {
        intercepts: {}, // keys are intercepted function names, values functions
        earlyEventHandlers: {}, // keys are event types, values are arrays of handlers
        turns: [],      // stack of {fnc: <function>, args: []}
        turn: 0,        // turns.length set by wrapEntryPoint
        functions: {},  // keys filename, values {<function_ids>: [<activations>]}
        fireLoad: fireLoad,
        trace: trace,
        extractTracepoint:  extractTracepoint, // searches for tracepoints matching a query
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

    function findMatchingActivation(activation, traceValue) {
      var match;
      // Is it better to store the file/offset for each tracepoint or do this search?
      Object.keys(window.__qp.functions).some(function(file) {
        var functions = window.__qp.functions[file];
        return Object.keys(functions).some(function(offset) {
          var activations = functions[offset];
          var index = activations.indexOf(activation);
          if (index !== -1) {
            match = {functionOffset: offset, file: file, activation: activation, traceValue: traceValue};
            return true;
          }
        });
      });
      return match;
    }

    function extractTracepoint(queryName, identifier) {
      // eg window.__qp['propertyChange']['prop']
      var tps = window.__qp[queryName][identifier];
      console.log("extractTracepoint("+queryName+"," + identifier +")->", tps);
      return tps.map(function(tp) {

        var activation = tp.activations[tp.activationIndex - 1];
        console.log("tp", tp);
        console.log('activation', activation);
        return findMatchingActivation(activation, tp.traceValue);
      })[0];  // TODO we should only have one result I think
    }
     
    initializeHiddenGlobalState();
    grabLoadEvent();
    interceptEntryPoints();
    wrapEntryPoint(function andWeBegin() {
      console.log("----------------------- Querypoint Runtime Initialized ---------------------------------");
      console.log("window.__qp: %o", window.__qp);    
    }());
  }; 

  Querypoint.QPRuntime = {
    initialize: function() {
      this.runtime =  [define__qp];
      this.source = [];
      return this;
    },
    runtimeSource: function() {
      var fncs = this.runtime.map(function(fnc) {
        return '(' + fnc + ')();\n';
      });
        
      return fncs + '\n' + this.source.join('\n');
    },
    appendFunction: function(fnc) {
      this.runtime.push(fnc);
    },
    appendSource: function(scr) {
      this.source.push(scr);
    }
  };
  Querypoint.QPRuntime.initialize();
   
}());