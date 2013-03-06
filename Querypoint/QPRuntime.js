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
        console.log("qp| loadEvent " + window.__qp_reloads);
        var handlers = window.__qp.artificalLoadEventHandlers['load'];
        if (handlers) {
          if (debug_in_page) {
            var loadInfo = 'loaded: ' + !!window.__qp.loadEvent;
            var handlerInfo = handlers.length + ' handlers';
            console.log('qp| debug fireLoad,  ' + handlerInfo,  handlers.map(function(h){return h.toString()}));
          }
          handlers.forEach(function fireOne(handler){
            handler(window.__qp.loadEvent);
          });
          if (debug_in_page) {
            console.log("qp| debug fireLoad complete, fired "+handlers.length+" handlers");
          }
          return handlers.length;
        } else {
          if (debug_in_page) 
            console.log("qp| debug fireLoad no artificalLoadEventHandlers");
        }
      } catch(exc) {
        console.error("qp| debug fireLoad fails "+exc, exc.stack);
        return exc.toString();
      }
    }

    function fireLoadAfterRealLoad() {
      if (debug_in_page) 
        console.log("qp| debug fireLoadAfterRealLoad fireLoadTrigger " + !!fireLoadTrigger);
      if (fireLoadTrigger) 
        return fireLoadTrigger.call();
      else 
        fireLoadTrigger = fireLoad;
    }

    function trace(expr) {
      if (typeof expr === 'object') {
        var objTrace = Object.keys(expr).map(function(key){
          return key+ ': ' + expr[key];
        }).join(',');
        return '{' + objTrace + '}';
      } else {
        return expr + '';  
      }
    }

    function grabLoadEvent() {
      window.addEventListener('load', function grabbedLoadEvent(event) {
        window.__qp.loadEvent = event;
        if (debug_in_page) 
          console.log("qp| debug  grabLoadEvent; beforeArtificalLoadEvent: " + beforeArtificalLoadEvent + ' loaded: ' + !!window.__qp.loadEvent);
        fireLoadAfterRealLoad();
      });
      window.addEventListener('DOMContentLoaded', function(event) {
        window.__qp.DOMContentLoaded = event;
        if (debug_in_page) console.log("qp| debug  grabLoadEvent DOMContentLoaded event, stored");
      });
    }
    
    var reTranscodedFunctionPreamble = /{([^;]*);/;
    var reFunctionsData = /\[\"([^\"]*)\"\]\[([^\]]*)\]/;

    function appendFileInfoFromPreamble(entryPointFunction, startInfo) {
      if (entryPointFunction.__qp) {
          for (var key in entryPointFunction.__qp) startInfo[key] = entryPointFunction.__qp[key];
          // startInfo = entryPointFunction.__qp;
        } else {
          var preamble = reTranscodedFunctionPreamble.exec(entryPointFunction + '');
          if (preamble) {
            var functionsData = reFunctionsData.exec(preamble[1]);
            if (functionsData) {
              startInfo.filename = functionsData[1];
              startInfo.offset = functionsData[2];
              startInfo.name = entryPointFunction.name || '(anonymous)';
              entryPointFunction.__qp = {
                filename: startInfo.filename,
                offset: startInfo.offset,
                name: startInfo.name
              };
            }
          } else {
            startInfo.offset = 0;
            startInfo.filename = '?';
            startInfo.name = entryPointFunction.name || '(anonymous)';
          }
        }
        return startInfo;
    }

    function getStartInfo(entryPointFunction, args) {
      var startInfo = {fnc: entryPointFunction, args: args};
      if (typeof entryPointFunction === 'string') {
        entryPointFunction = function ScriptBody(){};
        startInfo.name = '[[ScriptBody]]';
        startInfo.filename = args[0].name;
        startInfo.offset = 0; // outer function
      } else if (typeof entryPointFunction === 'function') {
        startInfo = appendFileInfoFromPreamble(entryPointFunction, startInfo);
      } else {
        throw new Error('QPRuntime.startTurn: illegal entryPointFunction ', entryPointFunction);
      }
      return startInfo;
    }

    function startTurn(entryPointFunction, args) {
      var startInfo = getStartInfo(entryPointFunction, args);
      var eventObject = args[0];    
      var targetSelector = '';
      if (eventObject.target) {
        var element = eventObject.target;
        startInfo.target = element;
        targetSelector = getSelectorUniqueToElement(element);
        if (targetSelector in window.__qp._traceSettersBySelector) {
          var setters = window.__qp._traceSettersBySelector[targetSelector];
          if (debug_in_page) console.log('qp| debug QPRuntime.startTurn ' + setters.length + ' setters for ' + targetSelector);
          setters.forEach(function(setter) {
            setter.call(null, element)
          });
        }
      }

      window.__qp.turns.push(startInfo); 
      var turn = window.__qp.turn = window.__qp.turns.length; 
      var functionInfo = startInfo.name + ' ' + (startInfo.filename || '?') + ' ' + startInfo.offset;
      var eventInfo = eventObject.type || eventObject.name || eventObject.constructor.name;
      console.log("qp| startTurn " + turn + ' ' + functionInfo + ' ' + eventInfo +  ' ' + targetSelector);
      return turn;
    }

    function endTurn(turn) {
      console.log("qp| endTurn " + turn); 
    }

    function wrapEntryPoint(entryPointFunction) {
      if (!entryPointFunction)
        return function noop(){};
      //entryPointFunction.wrappedAt = (new Date()).getTime();
      return function wrapperOnEntryPoint() {
        var args = Array.prototype.slice.apply(arguments);
        var turn = startTurn(entryPointFunction, args);
        entryPointFunction.apply(null, args);  // TODO check |this| maybe use null
        endTurn(turn);
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
          console.log("qp| debug addEventListener "+type + " beforeArtificalLoadEvent "+ !!beforeArtificalLoadEvent + ' loaded: ' + !!window.__qp.loadEvent);
        var wrapped = wrapEntryPoint(listener);
        if (beforeArtificalLoadEvent) {
          var handlers = window.__qp.artificalLoadEventHandlers;
          if (!handlers[type]) {
            handlers[type] = [wrapped];
          } else {
            handlers[type].push(wrapped);
          }
          if (type !== 'load')
            console.error('qp| debug interceptEntryPoints not a load event, we fail!', type);  
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

    function formatTracepoint(tp) {
      // Defines the tracepoint API
      return {
        value: tp.value,
        valueType: typeof tp.value, // JSON will not transmit undefined values correctly.
        functionOffset: tp.functionOffset,
        turn: tp.turn,
        activationCount: tp.activationCount,
        startOffset: tp.startOffset,
        file: tp.file,
        endOffset: tp.endOffset
      };
    }

    function extractTracepoints(tps) {
      try {
        if (debug_in_page) console.log("qp| debug extractTracepoints", tps);
        return tps.map(function(tp) {
          var activation = tp.activations[tp.activationIndex - 1];
          if (debug_in_page) {
            console.log("qp| debug extractTracepoints tp", tp);
            console.log('qp| debug extractTracepoints activation', activation);
          }
          return formatTracepoint(findMatchingActivation(activation, tp));
        });
      } catch (exc) {
        console.error('qp| debug extractTracepoints failed '+exc, exc);
        return exc.toString();
      }  
    }
    
    // For lastChange
    function reducePropertyChangesToTracedObject(propertyKey, tracedObjectIndex) {
      if (debug_in_page) {
        if (window.__qp.propertyChanges[propertyKey]) 
          console.log("qp| debug reducePropertyChangesToTracedObject starts with " + window.__qp.propertyChanges[propertyKey].length);
        else
          console.error('qp| debug reducePropertyChangesToTracedObject propertyChanges not Initialized for ' + propertyKey);
      }
      var changes = window.__qp.propertyChanges[propertyKey];
      if (!changes || !changes.length) {
        if (debug_in_page) console.warn("qp| debug reducePropertyChangesToTracedObject No changes for " + propertyKey + ' at ' + tracedObjectIndex);
        return [];
      }
      if (!changes.objectTraced) {
        if (debug_in_page) console.error("qp| debug reducePropertyChangesToTracedObject no objectTraced for " + propertyKey + ' at ' + tracedObjectIndex);
        return [];
      }
      var object = changes.objectTraced[tracedObjectIndex];
      var rawTracepoints = changes.reduce(
        function(ours, change) {
          if (debug_in_page) console.log("qp| debug reducePropertyChangesToTracedObject %o =?= %o", change.obj, object, change);
          if (change.obj === object) ours.push(change);
          return ours; 
        },
        []
      );
      if (debug_in_page) console.log("qp| debug reducePropertyChangesToTracedObject ends with " + rawTracepoints.length);
      return extractTracepoints(rawTracepoints);
    }

        // For lastChange
    function setTracedPropertyObject(object, propertyKey, tracedObjectIndex) {
      // We are setting a property on an array here.
      window.__qp.propertyChanges[propertyKey].objectTraced = window.__qp.propertyChanges[propertyKey].objectTraced || {};
      window.__qp.propertyChanges[propertyKey].objectTraced[tracedObjectIndex] = object;
      if (debug_in_page) 
        console.log("qp| debug setTracedPropertyObject: %o setting " + propertyKey, object, window.__qp.propertyChanges[propertyKey].objectTraced);
    }

    function setTracedElement(selector, propertyKey, tracedObjectIndex) {
      // Triggered during startTurn
      var bySelector = window.__qp._traceSettersBySelector;
      bySelector[selector] = bySelector[selector] || [];
      bySelector[selector].push(function _setTracedElement(element) {
        setTracedPropertyObject(element, propertyKey, tracedObjectIndex);
        if (!window.__qp.isTraced(propertyKey))
          window.__qp.setTraced(propertyKey);
      });
      if (debug_in_page) 
        console.log('qp| debug QPRuntime.setTracedElement ' + selector + ' key ' + propertyKey + ' index ' + tracedObjectIndex + ': ' + bySelector[selector].length);
    }

    function getSelectorUniqueToElement(element) {
      var path;
      if (element.nodeName === '#document') return '#document';
      while (element) {
          var name = element.localName;
          if (!name) break;

          name = name.toLowerCase();
          if (element.id) {
              // As soon as an id is found, there's no need ascend further
              return name + '#' + element.id + (path ? '>' + path : '');
          } else if (element.className) {
              name += '.' + element.className.split(/\s+/).join('.');
          }

          var parent = element.parentElement;

          var sibling = parent && parent.firstChild;
          var ith = 0;
          while(sibling && sibling !== element) {
            sibling = sibling.element;
            ith++;
          }
          if (ith) {
            name += ':eq(' + ith + ')'; 
          }
          
          path = name + (path ? '>' + path : '');

          element = parent;
      }
      return path;
    };

    function initializeHiddenGlobalState() {
      window.__qp = {
        intercepts: {}, // keys are intercepted function names, values functions
        artificalLoadEventHandlers: {}, // keys are event types, values are arrays of handlers
        turns: [],      // stack of {fnc: <function>, args: []}
        turn: 0,        // turns.length set by wrapEntryPoint
        functions: {},  // keys filename, values {<function_ids>: [<activations>]}
        interceptEntryPoints: interceptEntryPoints, // call just before we load traced source.
        fireLoad: fireLoadAfterRealLoad,  // hack until script preprocessor corrected
        setTraced: function(propertyName) {  // called by eval
          this._propertiesTraced.push(propertyName);
        },
        isTraced: function(propertyName) {
          return (this._propertiesTraced.indexOf(propertyName) !== -1);
        },
        _propertiesTraced: [],
        trace: trace,
        setTracedPropertyObject: setTracedPropertyObject, // store the traced object by property
        setTracedElement: setTracedElement,               // store traced object by selector and property
        _traceSettersBySelector: {},
        reducePropertyChangesToTracedObject: reducePropertyChangesToTracedObject, // changes limited to object
        startTurn: startTurn,  // standard turn marking 
        endTurn: endTurn,
      };      
    }
     
    initializeHiddenGlobalState();
    // Hacks on global built-ins
    grabLoadEvent();
    recordEntryPoints();
    interceptEntryPoints();
    
    function andWeBegin() {
      console.log("qp| reload " + window.__qp_reloads + " ----------------------- Querypoint Runtime Initialized ---------------------------------");
      if (debug_in_page) console.log("qp| debug wrapEntryPoint: window.__qp: %o", window.__qp);    
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
      if (debug) console.log("qp| debug QPRuntime creating runtime for load#" + numberOfReloads);
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

