// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  window.Querypoint = window.Querypoint || {};
  /** 
   * A function that runs in the debuggee web page before any other JavaScript
   */
  function define__qp() {

    var early = true;
    var debug = true;

    function fireLoad() {
      try {
        // So far we cannot transcode synchronously so we miss the 'load' event
        early = false;
        var handlers = window.__qp.earlyEventHandlers['load'];
        if (handlers) {
          if (debug) console.log("Querypoint.runtime, "+handlers.length+" handlers", handlers.map(function(h){return h.toString()}));
          handlers.forEach(function(handler){
            handler(window.__qp.loadEvent);
          });
          if (debug) console.log("Querypoint.runtime: fireLoad complete, fired "+handlers.length+" handlers");
          console.log("qp| loadEvent " + window.__qp_reloads);
          return handlers.length;
        } else {
          if (debug) console.log("Querypoint.runtime: fireLoad no earlyEventHandlers");
        }
      } catch(exc) {
        console.error("Querypoint.runtime fireLoad fails "+exc, exc.stack);
        return exc.toString();
      }

    }
    
    function trace(expr) {
      return expr + '';
    }

    function grabLoadEvent() {
      window.addEventListener('load', function(event) {
        window.__qp.loadEvent = event;
        if (debug) console.log("load");
      });
    }
       
    function wrapEntryPoint(entryPointFunction) {
      return function() {
        var args = Array.prototype.slice.apply(arguments);
        window.__qp.turns.push({fnc: entryPointFunction, args: args}); 
        window.__qp.turn = window.__qp.turns.length; 
        if (debug) console.log("qp| startTurn " + window.__qp.turn); 
        entryPointFunction.apply(window, args);  // TODO check |this| maybe use null
        if (debug) console.log("qp| endTurn " + window.__qp.turn); 
      }
    }

    function recordEntryPoints() {
      window.__qp.intercepts.addEventListener = window.addEventListener;
      window.__qp.intercepts.Node = {prototype: {addEventListener: window.Node.prototype.addEventListener}};
    }

    function blockEntryPoints() {
      // Hack because we must allow untraced JS to run before our traced JS runs
      var noop = function(){};
      window.addEventListener = noop;
    }

    // This function will run just before the traced source is compiled in the page.
    function interceptEntryPoints() {  
      window.addEventListener = function(type, listener, useCapture) {
        if (debug) console.log("intercepting "+type + " it is "+(early ? "early" : "late"));
        var wrapped = wrapEntryPoint(listener);
        window.__qp.intercepts.addEventListener.call(this, type, wrapped, useCapture);
        if (early) {
          var handlers = window.__qp.earlyEventHandlers;
          if (!handlers[type]) {
            handlers[type] = [wrapped];
          } else {
            handlers[type].push(wrapped);
          }  
        }         
      }
      
      window.Node.prototype.addEventListener = function(type, listener, useCapture) {
        window.__qp.intercepts.Node.prototype.addEventListener.call(this, type, wrapEntryPoint(listener), useCapture);
      }
    }

    function findMatchingActivation(activation, tp) {
      var match;
      // Is it better to store the file/offset for each tracepoint or do this search?
      Object.keys(window.__qp.functions).some(function(file) {
        var functions = window.__qp.functions[file];
        return Object.keys(functions).some(function(offset) {
          var activations = functions[offset];
          var index = activations.indexOf(activation);
          if (index !== -1) {
            match = tp;
            match.functionOffset = offset;
            match.turn = activation.turn;
            match.activationCount = index;
            return true;
          }
        });
      });
      return match;
    }

    function extractTracepoint(queryName, identifier) {
      try {
        // eg window.__qp['propertyChange']['prop']
        var tps = window.__qp[queryName][identifier];
        if (debug) console.log("extractTracepoint("+queryName+"," + identifier +")->", tps);
        return tps.map(function(tp) {
          var activation = tp.activations[tp.activationIndex - 1];
          if (debug) console.log("tp", tp);
          if (debug) console.log('activation', activation);
          return findMatchingActivation(activation, tp);
        });
      } catch (exc) {
        console.error('extractTracepoint(' + queryName + ', ' + identifier + ') failed '+exc, exc);
        return exc.toString();
      }  
    }
    
    // For lastChange
    function reducePropertyChangesToTracedObject(propertyKey) {
      if (debug) console.log("reducePropertyChangesToTracedObject starts with " + window.__qp.propertyChanges[propertyKey].length);
      var changes = window.__qp.propertyChanges[propertyKey];
      var object = changes.objectTraced;
      window.__qp.propertyChanges[propertyKey] = changes.reduce(
        function(ours, change) {
          if (change.obj === object) ours.push(change);
          return ours; 
        },
        []
      );
      if (debug) console.log("reducePropertyChangesToTracedObject ends with " + window.__qp.propertyChanges[propertyKey].length);
      return extractTracepoint('propertyChanges', propertyKey);
    }

        // For lastChange
    function setTracedPropertyObject(object, propertyKey) {
      if (debug) console.log("setTracedPropertyObject setting" + propertyKey, object);
      // We are setting a property on an array here.
      window.__qp.propertyChanges[propertyKey].objectTraced = object;
    }
     
    function initializeHiddenGlobalState() {
      window.__qp = {
        intercepts: {}, // keys are intercepted function names, values functions
        earlyEventHandlers: {}, // keys are event types, values are arrays of handlers
        turns: [],      // stack of {fnc: <function>, args: []}
        turn: 0,        // turns.length set by wrapEntryPoint
        functions: {},  // keys filename, values {<function_ids>: [<activations>]}
        interceptEntryPoints: interceptEntryPoints, // call just before we load traced source.
        fireLoad: fireLoad,
        trace: trace,
        extractTracepoint:  extractTracepoint, // searches for tracepoints matching a query
        setTracedPropertyObject: setTracedPropertyObject, // store the traced object by property
        reducePropertyChangesToTracedObject: reducePropertyChangesToTracedObject, // changes limited to object
      };      
    }
     
    initializeHiddenGlobalState();
    // Hacks on global built-ins
    grabLoadEvent();
    recordEntryPoints();
    blockEntryPoints();

    wrapEntryPoint(function andWeBegin() {
      if (debug) console.log("qp| reload " + window.__qp_reloads + " ----------------------- Querypoint Runtime Initialized ---------------------------------");
      if (debug) console.log("window.__qp: %o", window.__qp);    
    }());
  }; 

  Querypoint.QPRuntime = {
    initialize: function() { 
      this.runtime =  [define__qp];
      this.source = [];
      return this;
    },
    runtimeSource: function(numberOfReloads) {
      console.log("QPRuntime creating runtime for load#" + numberOfReloads);
      var fncs = this.runtime.map(function(fnc) {
        return '(' + fnc + ')();\n';
      });
      var reload = 'window.__qp_reloads = ' + numberOfReloads + ';\n';  
      return reload + fncs + '\n' + this.source.join('\n') + "//@ sourceURL='QPRuntime.js'\n";
    },
    appendFunction: function(fnc) {
      this.runtime.push(fnc);
    },
    appendSource: function(scr) {
      this.source.push(scr);
    }
  };
   
}());