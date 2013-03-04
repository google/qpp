// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  Querypoint.ElementChangeQuery = function(selector, tree) {
    this._selector = selector;
    this._tree = tree;
  }

  Querypoint.ElementChangeQuery.ifAvailableFor = function(project, selector, functionInfo) {
    var tree = project.find(functionInfo.filename, functionInfo.startOffset - 1);
    if (tree)
      return new Querypoint.ElementChangeQuery(selector, tree);
  }

  Querypoint.ElementChangeQuery.prototype = {
    __proto__: Querypoint.ValueChangeQuery.prototype,

    _properties: ['innerHTML'],
    _transformers: [],

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
      this._setTracedElementTransformer = new Querypoint.SetTracedElementTransformer(this._selector, this._properties, this._queryIndex);
      this._tree.location.query = this;
    },

    transformParseTree: function(tree) {
      if (!tree.hasValueChangeTransform) {
        // This transform is generic to all value-change tracing
        tree = this._transformer.transformAny(tree);
        tree.hasValueChangeTransform = true;
      }

      return tree;
    },

    runtimeSource: function() {
      var src = '';
      this._setTracedElementTransformer.runtimeInitializationStatements().forEach(function(tree){
        src += traceur.outputgeneration.TreeWriter.write(tree) + '\n';
      });
      return src;
    },

    extractTracepoints: function(fileViewModel, onTracepoint) {
      var query = this;
      function onEval(result, isException) {
         if (!isException && result && result instanceof Array) {
          var changes = result;
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
      var tracedObjectIndex = query._queryIndex;
      query._properties.forEach(function(property){
        var expr = 'window.__qp.reducePropertyChangesToTracedObject(\"' + property + '\",' + tracedObjectIndex + ')';
        chrome.devtools.inspectedWindow.eval(expr, onEval);        
      });
    },

  };

}());
