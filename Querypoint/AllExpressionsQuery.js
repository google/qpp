// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

window.Querypoint = window.Querypoint || {};

Querypoint.AllExpressionsQuery = function(tree, project) {
  this.generateFileName = project.generateFileName;
  Querypoint.Query.call(this);
  this.tree = tree;
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
    this._transformer = new Querypoint.LinearizeTransformer(this.generateFileName);
  },

  tracePromptText: function() {
    return "(awaiting execution)";
  },
  
  // Add tracing code to the parse tree. Record the traces onto __qp.propertyChanges.<identifier>
  // 
  transformParseTree: function(tree) {
    if (Querypoint.AllExpressionsQuery.filesTraced[tree.location.start.source.name]) {
      return this._transformer.transformAny(tree);  
    } else {
      return tree;
    }
  },

  runtimeSource: function() {
    return "";
  },
  
  // Pull trace results out of the page for this querypoint
  extractTracepoints: function(fileViewModel, currentTree, onTracepoint) {
    function onEval(traceData, isException) {
       if (!isException && traceData) {
        traceData.query = this;
        fileViewModel.treeRoot().traceData(traceData); 
        onTracepoint();
      }
    }
    var fileName = fileViewModel.treeRoot().location.start.source.name;
    chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"' + fileName + '\"]', onEval.bind(this));
  },
};

}());
