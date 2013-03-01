// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  Querypoint.ElementChangeQuery = function(selector) {
    this._selector = selector;
  }

  Querypoint.ElementChangeQuery.ifAvailableFor = function(selector) {
    return new Querypoint.ElementChangeQuery(selector);
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
    
    iconText: function() {
      return 'Trace Element';
    },
    
    toolTip: function() {
      return "Trace the changes to the target element";
    },

    activate: function(queryIndex) {
      this._queryIndex = queryIndex;
      this._transformer = new Querypoint.ValueChangeQueryTransformer();
      this._setTracedElementTransformer = new Querypoint.SetTracedElementTransformer(this._selector, this._properties, this.queryIndex);
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

    extractTracepoints: function(fileViewModel, currentTree, onTracepoint) {
      function onEval(result, isException) {
         if (!isException && result && result instanceof Array) {
          var changes = result;
          changes.forEach(function(change) {
            var trace = change;
            if (trace.valueType === 'undefined')
              trace.value = 'undefined';
            trace.query = this;
            trace.load = fileViewModel.project.numberOfReloads;
            trace.activation = change.activationCount;
            onTracepoint(trace);  
          }.bind(this));      
        } else {
          console.error("ValueChangeQuery extractTracepoints eval failed", isException, result); 
        }
      }
      var tracedObjectIndex = this._queryIndex;
      this._properties.forEach(function(property){
        var expr = 'window.__qp.reducePropertyChangesToTracedObject(\"' + property + '\",' + tracedObjectIndex + ')';
        chrome.devtools.inspectedWindow.eval(expr, onEval.bind(this));        
      });
    },

  };

}());
