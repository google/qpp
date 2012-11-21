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

Querypoint.ValueChangeQueryTracerVisitor = {
  visitSome: function(tree) {
    var method = 'visit' + getTreeNameForType(tree.type);
    if (this.hasOwnProperty(method)) {
      return this[method].call(this, tree);
    }
  },
  visitMemberExpression: function(tree) {
    return tree.memberName;
  }
};

Querypoint.ValueChangeQueryTracer = function(identifier, tree) {
  this.identifier = identifier;
  this.queryLocation = tree;
  this._transformer = new Querypoint.ValueChangeQueryTransformer(this.identifier);
}

Querypoint.ValueChangeQuery = function(identifier, tree) {
  this.identifier = identifier; 
  this.tree = tree;
}
  
Querypoint.ValueChangeQuery.ifAvailableFor = function(tree) {
  var identifier = Querypoint.ValueChangeQueryTracerVisitor.visitSome(tree);
  if (identifier) {
    return new Querypoint.ValueChangeQuery(identifier, tree);
  }
},


Querypoint.ValueChangeQuery.prototype = {

  buttonName: function() {
    console.log("ValueChangeQuery buttonName called")
    return 'lastChange';
  },
  
  toolTip: function() {
    return "Trace the changes to the current expression and report the last one";
  },
  
  activateQuery: function(fileViewModel) {
    this.tree.location.query = this;      // mark tree as qp
    fileViewMode.queryViewModel.issueQuery(new Querypoint.ValueChangeQueryTracer(this.identifier, this.tree));
  },
}

Querypoint.ValueChangeQueryTracer.prototype = {

  // Add tracing code to the parse tree. Record the traces onto __qp.propertyChanges.<identifier>
  // 
  transformParseTree: function(tree) {
    return this._transformer.transformAny(tree);
  },

  runtimeSource: function() {
    var tree = this._transformer.runtimeInitializationStatements();
    return traceur.outputgeneration.TreeWriter.write(tree);
  },

  // Pull trace results out of the page for this querypoint
  extractTracepoints: function(rootTree, onTracepoint) {
    function onEval(result, isException) {
       if (!isException) {       
        onTracepoint(result)
      }
    }
    chrome.devtools.inspectedWindow.eval('window.__qp.extractTracepoint("propertyChanges","prop")', onEval);
  },
};


}());
