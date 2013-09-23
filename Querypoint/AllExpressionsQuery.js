// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  var debug = DebugLogger.register('AllExpressionsQuery', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  Querypoint.AllExpressionsQuery = function(tree, project) {
    Querypoint.Query.call(this);
    this.tree = tree;
    this._project = project;
  }

  // global record of which files are traced.
  Querypoint.AllExpressionsQuery.filesTraced = {};

  Querypoint.AllExpressionsQuery.ifAvailableFor = function(tree, project) {
    if(!!tree.location) {
      var query = Querypoint.AllExpressionsQuery.prototype.getQueryOnTree(tree, Querypoint.AllExpressionsQuery);
      return query || new Querypoint.AllExpressionsQuery(tree, project);
    }
  }

  Querypoint.AllExpressionsQuery.prototype = {
    __proto__: Querypoint.Query.prototype,

    setQueryOnTree: function(tree, query) {
      Querypoint.AllExpressionsQuery.filesTraced[tree.location.start.source.name] = query;
    },

    getQueryOnTree: function(tree, queryConstructor) {
       return Querypoint.AllExpressionsQuery.filesTraced[tree.location.start.source.name];
    },
    
    title: function() {
      return 'All in File';
    },
    
    // Initiates query
    buttonName: function() {
      return 'All in File';
    },
    
    // Documents query in trace
    iconText: function() {
      return '&#x2799;&#x2263;';
    },
    
    toolTip: function() {
      return "Trace all expressions in all functions in this file";
    },
    
    activate: function() {
      var transformData = {
        filenames: Object.keys(Querypoint.AllExpressionsQuery.filesTraced)
      };
      this._transformer = new Querypoint.AllInFileTransformer(transformData);
      this._isActive = true;
    },

    queryData: function() {
      return {
          filenames: Object.keys(Querypoint.AllExpressionsQuery.filesTraced)
        };
    },

    matches: function(ctor, queryData) {
      return (ctor === Querypoint.AllExpressionsQuery) &&
        (queryData.filenames === this.queryData().filenames);
    },

    transformDescriptions: function() {
      return [{
        ctor: 'AllInFileTransformer',
        queryData: this.queryData()
      }];
    },
    
    transformers: function() {
      return [this._transformer];
    },

    targetTree: function() {
      return this.tree;
    },

    tracePromptText: function() {
      return "(awaiting execution)";
    },
    
    // Add tracing code to the parse tree. Record the traces onto __qp.propertyChanges.<identifier>
    // 
    transformParseTree: function(tree) {
      return this._transformer.transformTree(tree);
    },

    runtimeSource: function() {
      return "";
    },
    
    // Pull trace results out of the page for this querypoint
    extractTracepoints: function(fileViewModel, onTracepoint) {
      var fileName = fileViewModel.treeRoot().location.start.source.name;
      function onEval(traceData, isException) {
        if (debug)
          console.log("AllExpressionsQuery.extractTracepoints from " + fileName, traceData);
        if (!isException && traceData) {
          traceData.query = this;
          traceData.project = this._project;
          fileViewModel.treeRoot().traceData(traceData);
          onTracepoint();  // We don't have trace data from another tree (unlike lastChange)
        }
      }
      chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"' + fileName + '\"]', onEval.bind(this));
    },
  };

}());
