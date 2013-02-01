// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

window.Querypoint = window.Querypoint || {};

function protect(expr) {
    return "eval(" + expr + ")"; // unwrapped by Querypoints
}

function unprotect(str) {
    return str.replace(/:\"eval\(([^\)]*)\)\"/,":$1");
}

var getTreeNameForType = traceur.syntax.trees.getTreeNameForType;

function getValueReferenceIdentifier(tree) {
  switch(tree.type) {
    case "MEMBER_EXPRESSION": return tree.memberName;
  }
}

Querypoint.ValueChangeQuery = function(identifierTree, tree, project) {
  Querypoint.Query.call(this);
  this.identifier = identifierTree.value;
  console.assert(typeof this.identifier === 'string'); 
  this.tree = tree;
  this.generateFileName = project.generateFileName;
}
  
Querypoint.ValueChangeQuery.ifAvailableFor = function(tree, project) {
  var identifierTree = getValueReferenceIdentifier(tree);
  if (identifierTree) {
    var query = Querypoint.ValueChangeQuery.prototype.getQueryOnTree(tree, Querypoint.ValueChangeQuery);
    return query || new Querypoint.ValueChangeQuery(identifierTree, tree, project);
  }
},


Querypoint.ValueChangeQuery.prototype = {
  __proto__: Querypoint.Query.prototype,

  title: function() { 
    return 'lastChange';
  },
  
  buttonName: function() {
    return 'lastChange';
  },
  
  iconText: function() {
    return '&#x1D6AB;';
  },
  
  toolTip: function() {
    return "Trace the changes to the current expression and report the last one";
  },
  
  activate: function() {
    this._transformer = new Querypoint.ValueChangeQueryTransformer(this.identifier, this.generateFileName, this.tree);
    this.tree.location.query = this;
  },

  tracePromptText: function() {
    return "(no changes)";
  }, 
  
  // Add tracing code to the parse tree. Record the traces onto __qp.propertyChanges.<identifier>
  // 
  transformParseTree: function(tree) {
    return this._transformer.transformAny(tree);
  },

  runtimeSource: function() {
    var src = '';
    this._transformer.runtimeInitializationStatements().forEach(function(tree){
      src += traceur.outputgeneration.TreeWriter.write(tree) + '\n';
    });
    return src;
  },

  // Pull trace results out of the page for this querypoint
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
    var tracedObjectOffset = this.tree.location.start.offset;
    var expr = 'window.__qp.reducePropertyChangesToTracedObject(\"' + this.identifier + '\",' + tracedObjectOffset + ')';
    chrome.devtools.inspectedWindow.eval(expr, onEval.bind(this));
  },
};


}());
