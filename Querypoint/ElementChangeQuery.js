// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  Querypoint.ElementChangeQuery = function(selector, functionURL, tree) {
    this._selector = selector;
    this._functionURL = functionURL;
    this._tree = tree;
  }

  Querypoint.ElementChangeQuery.ifAvailableFor = function(project, selector, functionURL) {
    var functionInfo = project.parseFileURL(functionURL);
    var tree = project.find(functionInfo.filename, functionInfo.startOffset - 1);
    if (tree)
      return new Querypoint.ElementChangeQuery(selector, functionURL, tree);
  }

  Querypoint.ElementChangeQuery.prototype = {
    __proto__: Querypoint.ValueChangeQuery.prototype,

    _properties: ['innerHTML'],

    title: function() { 
      return 'traceElement';
    },
    
    buttonName: function() {
      return 'traceElement';
    },

    toolTip: function() {
      return "Trace the changes to the target element";
    },

    activate: function(queryIndex) {
      this._queryIndex = queryIndex;
      this._transformer = new Querypoint.ValueChangeQueryTransformer();
      var transformData = {
        selector: this._selector,
        propertyKeys: this._properties,
        queryIndex: queryIndex,
      };
      this._setTracedElementTransformer = new Querypoint.SetTracedElementTransformer(transformData);
      this._tree.location.query = this;
      this._isActive = true;
    },

    matches: function(ctor, queryData) {
      return (ctor === Querypoint.ElementChangeQuery) && 
        (queryData.selector === this._selector) &&
        (queryData.functionURL === this._functionURL);
    },

    transformDescriptions: function() {
      return [
        {
          ctor: 'ValueChangeQueryTransformer'
        },
        {
          ctor: 'SetTracedElementTransformer',
          queryData: {
            selector: this._selector,
            propertyKeys: this._properties,
            queryIndex: this._queryIndex,
          }
        }
      ];
    },
    
    transformers: function() {
      return [this._transformer, this._setTracedElementTransformer];
    },

    transformParseTree: function(tree) {
      return this._transformer.transformTree(tree);
    },

    runtimeSource: function() {
      var src = '';
      this._setTracedElementTransformer.runtimeInitializationStatements().forEach(function(tree){
        src += traceur.outputgeneration.TreeWriter.write(tree) + '\n';
      });
      return src;
    },

    extractTracepoints: function(fileViewModel, onTracepoint, logScrubber) {
      var query = this;
      function onEval(result, isException) {
         if (query._lastEvaluated === result.turn && query._lastLoadEvaluated === logScrubber.loadStarted()) return;
         query._lastEvaluated = result.turn;
         query._lastLoadEvaluated = logScrubber.loadStarted();
         if (!isException && result.tracepoints && result.tracepoints instanceof Array) {
          var changes = result.tracepoints;
          changes.forEach(function(change) {
            var trace = change;
            if (trace.valueType === 'undefined')
              trace.value = 'undefined';
            trace.query = query;
            trace.load = fileViewModel.project.numberOfReloads;
            trace.activation = change.activationCount;
            onTracepoint(trace);  
          });      
        } else {
          console.error("ValueChangeQuery extractTracepoints eval failed", isException, result); 
        }
      }
      var previousTurn = logScrubber.turnStarted() - 1;
      var thisLoad = logScrubber.loadStarted();

      if (!this._lastEvaluated || this._lastLoadEvaluated !== thisLoad || this._lastEvaluated === previousTurn) {
        var tracedObjectIndex = query._queryIndex;
        query._properties.forEach(function(property){
          var expr = 'window.__qp.reducePropertyChangesToTracedObject(\"' + property + '\",' + tracedObjectIndex + ')';
          chrome.devtools.inspectedWindow.eval(expr, onEval);
        });
      }
    },

  };

}());
