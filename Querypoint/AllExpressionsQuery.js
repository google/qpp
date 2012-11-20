// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

window.Querypoint = window.Querypoint || {};

// TODO this is copy and paste from QPProject
  function generateFileName(location) {
      return location ? location.start.source.name : "internal";
  };

Querypoint.AllExpressionsQueryTracer = function(tree) {
  Querypoint.AllExpressionsQueryTracer.filesTraced[tree.location.start.source.name] = this;
  this._transformer = new Querypoint.LinearizeTransformer(generateFileName);
}

Querypoint.AllExpressionsQueryTracer.filesTraced = {};


Querypoint.AllExpressionsQuery = function(tree) {
  this.tree = tree;
}

Querypoint.AllExpressionsQuery.ifAvailableFor = function(tree) {
  if(!!tree.location) return new Querypoint.AllExpressionsQuery(tree);
}


Querypoint.AllExpressionsQuery.prototype = {

  buttonName: function() {
    return 'All in File';
  },
  
  toolTip: function() {
    return "Trace all expressions in all functions in this file";
  },
  
  activateQuery: function(fileViewModel) {
    fileViewModel.queryViewModel.issueQuery(new Querypoint.AllExpressionsQueryTracer(this.tree));   
  },
};

Querypoint.AllExpressionsQueryTracer.prototype = {

  // Add tracing code to the parse tree. Record the traces onto __qp.propertyChanges.<identifier>
  // 
  transformParseTree: function(tree) {
    if (Querypoint.AllExpressionsQueryTracer.filesTraced[tree.location.start.source.name]) {
      return this._transformer.transformAny(tree);  
    }
  },

  runtimeSource: function() {
    return "";
  },

  // Pull trace results out of the page for this querypoint
  extractTracepoints: function(tree, onTracepoint) {
    function onEval(result, isException) {
       if (!isException) {       
        onTracepoint(result);
      }
    }
    var fileName = tree.location.start.source.name;
    chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"' + fileName + '\"]', callback);
  },
};


}());
