// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  var debug = DebugLogger.register('QPRuntime', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  /** 
   * A function that runs in the debuggee web page before any other JavaScript
   */
  function define__qp(debug_in_page) {

    var fireLoadTrigger = null;
    var beforeArtificalLoadEvent = true;
    
    function fireLoad() {
      try {
        // So far we cannot transcode synchronously so we miss the 'load' event
        beforeArtificalLoadEvent = false;
        var handlers = window.__qp.beforeArtificalLoadEventEventHandlers['load'];
        if (handlers) {
          if (debug_in_page) {
            var loadInfo = 'loaded: ' + !!window.__qp.loadEvent;
            var handlerInfo = handlers.length + ' handlers';
            console.log('__qp_runtime.fireLoad,  ' + handlerInfo,  handlers.map(function(h){return h.toString()}));
          }
          handlers.forEach(function fireOne(handler){
            handler(window.__qp.loadEvent);
          });
          if (debug_in_page) {
            console.log("__qp_runtime.fireLoad complete, fired "+handlers.length+" handlers");
          }
          console.log("qp| loadEvent " + window.__qp_reloads);
          return handlers.length;
        } else {
          if (debug_in_page) 
            console.log("__qp_runtime.fireLoad no beforeArtificalLoadEventEventHandlers");
        }
      } catch(exc) {
        console.error("__qp_runtime.fireLoad fails "+exc, exc.stack);
        return exc.toString();
      }
    }

    function fireLoadAfterRealLoad() {
      if (debug_in_page) 
        console.log("__qp_runtime.fireLoadAfterRealLoad fireLoadTrigger " + !!fireLoadTrigger);
      if (fireLoadTrigger) 
        return fireLoadTrigger.call();
      else 
        fireLoadTrigger = fireLoad;
    }
    
    function trace(expr) {
      return expr + '';
    }

    function grabLoadEvent() {
      window.addEventListener('load', function grabbedLoadEvent(event) {
        window.__qp.loadEvent = event;
        if (debug_in_page) 
          console.log("__qp_runtime. grabLoadEvent; beforeArtificalLoadEvent: " + beforeArtificalLoadEvent + ' loaded: ' + !!window.__qp.loadEvent);
        fireLoadAfterRealLoad();
      });
      window.addEventListener('DOMContentLoaded', function(event) {
        window.__qp.DOMContentLoaded = event;
        if (debug_in_page) console.log("__qp_runtime. grabLoadEvent DOMContentLoaded event, stored");
      });
    }
       
    function wrapEntryPoint(entryPointFunction) {
      if (!entryPointFunction)
        return function noop(){};
      //entryPointFunction.wrappedAt = (new Date()).getTime();
      return function wrapperOnEntryPoint() {
        var args = Array.prototype.slice.apply(arguments);
        window.__qp.turns.push({fnc: entryPointFunction, args: args}); 
        var turn = window.__qp.turn = window.__qp.turns.length; 
        var eventObject = args[0];
        /*var event = '';
        for(var key in eventObject){
            switch(typeof(eventObject[key])){
                case 'function':
                    event+= key + ':' + eventObject[key].name +'(),';
                    break;
                case 'object':
                    if(eventObject[key]) event+= key + ':[' + eventObject[key].constructor.name + '],';
                    else event+= key + ':null,';
                    break;
                default:
                    event+= key + ':' + eventObject[key]+',';
            }
        */
        var turnInfo = turn + ' ' + entryPointFunction.name;
        var targetInfo = '';
        if (eventObject.target) {
           var localName = eventObject.target.localName;
           var id = eventObject.target.id;
           targetInfo = (localName ? (localName + (id ? "#" + id : '')) : eventObject.target.nodeName);
        }
        var eventInfo = eventObject.type || eventObject.constructor.name;
        console.log("qp| startTurn " + turnInfo + ' ' + eventInfo +  ' ' + targetInfo) ; 
        entryPointFunction.apply(null, args);  // TODO check |this| maybe use null
        console.log("qp| endTurn " + window.__qp.turn); 
      }
    }

    function recordEntryPoints() {
      window.__qp.intercepts.addEventListener = window.addEventListener;
      window.__qp.intercepts.Node = {prototype: {addEventListener: window.Node.prototype.addEventListener}};
    }

    // This function will run just before the traced source is compiled in the page.
    function interceptEntryPoints() {
      window.addEventListener = function(type, listener, useCapture) {
       if (debug_in_page) 
          console.log("__qp_runtime.addEventListener "+type + " beforeArtificalLoadEvent "+ !!beforeArtificalLoadEvent + ' loaded: ' + !!window.__qp.loadEvent);
        var wrapped = wrapEntryPoint(listener);
        if (beforeArtificalLoadEvent) {
          var handlers = window.__qp.beforeArtificalLoadEventEventHandlers;
          if (!handlers[type]) {
            handlers[type] = [wrapped];
          } else {
            handlers[type].push(wrapped);
          }
          if (type !== 'load')
            console.error('__qp_runtime.interceptEntryPoints not a load event, we fail!', type);  
        } else {
          // We've already passed the artifical load event, so don't delay the add call
          window.__qp.intercepts.addEventListener.call(this, type, wrapped, useCapture);
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

    function extractTracepoints(tps) {
      try {
        if (debug_in_page) console.log("__qp_runtime.extractTracepoints", tps);
        return tps.map(function(tp) {
          tp.valueType = typeof tp.value; // JSON will not transmit undefined values correctly.
          var activation = tp.activations[tp.activationIndex - 1];
          if (debug_in_page) {
            console.log("__qp_runtime.extractTracepoints tp", tp);
            console.log('__qp_runtime.extractTracepoints activation', activation);
          }
          return findMatchingActivation(activation, tp);
        });
      } catch (exc) {
        console.error('__qp_runtime.extractTracepoints failed '+exc, exc);
        return exc.toString();
      }  
    }
    
    // For lastChange
    function reducePropertyChangesToTracedObject(propertyKey, tracedObjectOffset) {
      if (debug_in_page) console.log("reducePropertyChangesToTracedObject starts with " + window.__qp.propertyChanges[propertyKey].length);
      var changes = window.__qp.propertyChanges[propertyKey];
      if (!changes || !changes.length) {
        if (debug_in_page) console.error("__qp_runtime.reducePropertyChangesToTracedObject No chanages for " + propertyKey + ' at ' + tracedObjectOffset);
        return [];
      }
      if (!changes.objectTraced) {
        if (debug_in_page) console.error("__qp_runtime.reducePropertyChangesToTracedObject no objectTraced for " + propertyKey + ' at ' + tracedObjectOffset);
        return [];
      }
      var object = changes.objectTraced[tracedObjectOffset];
      var rawTracepoints = changes.reduce(
        function(ours, change) {
          if (debug_in_page) console.log("__qp_runtime.reducePropertyChangesToTracedObject %o =?= %o", change.obj, object, change);
          if (change.obj === object) ours.push(change);
          return ours; 
        },
        []
      );
      if (debug_in_page) console.log("__qp_runtime.reducePropertyChangesToTracedObject ends with " + window.__qp.propertyChanges[propertyKey].length);
      return extractTracepoints(rawTracepoints);
    }

        // For lastChange
    function setTracedPropertyObject(object, propertyKey, tracedObjectOffset) {
      // We are setting a property on an array here.
      window.__qp.propertyChanges[propertyKey].objectTraced = window.__qp.propertyChanges[propertyKey].objectTraced || {};
      window.__qp.propertyChanges[propertyKey].objectTraced[tracedObjectOffset] = object;
      if (debug_in_page) console.log("__qp_runtime.setTracedPropertyObject: %o setting " + propertyKey, object, window.__qp.propertyChanges[propertyKey].objectTraced);
    }
     
    function initializeHiddenGlobalState() {
      window.__qp = {
        intercepts: {}, // keys are intercepted function names, values functions
        beforeArtificalLoadEventEventHandlers: {}, // keys are event types, values are arrays of handlers
        turns: [],      // stack of {fnc: <function>, args: []}
        turn: 0,        // turns.length set by wrapEntryPoint
        functions: {},  // keys filename, values {<function_ids>: [<activations>]}
        interceptEntryPoints: interceptEntryPoints, // call just before we load traced source.
        fireLoad: fireLoadAfterRealLoad,
        trace: trace,
        setTracedPropertyObject: setTracedPropertyObject, // store the traced object by property
        reducePropertyChangesToTracedObject: reducePropertyChangesToTracedObject, // changes limited to object
      };      
    }
     
    initializeHiddenGlobalState();
    // Hacks on global built-ins
    grabLoadEvent();
    recordEntryPoints();
    interceptEntryPoints();
    
    function andWeBegin() {
      console.log("qp| reload " + window.__qp_reloads + " ----------------------- Querypoint Runtime Initialized ---------------------------------");
      if (debug_in_page) console.log("__qp_runtime.wrapEntryPoint: window.__qp: %o", window.__qp);    
    }

    var beginWrapped = wrapEntryPoint(andWeBegin);
    beginWrapped(new CustomEvent('BeginLoading'));
  }; 

  Querypoint.QPRuntime = {

    initialize: function() { 
      this.runtime =  [define__qp];
      this.source = [];
      return this;
    },
    runtimeSource: function(numberOfReloads) {
      if (debug) console.log("QPRuntime creating runtime for load#" + numberOfReloads);
      var fncs = this.runtime.map(function(fnc) {
        return '(' + fnc + '(' + debug + '));\n';
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

