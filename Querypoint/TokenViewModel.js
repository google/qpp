
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.Querypoint = window.Querypoint || {};
  
  Querypoint.TokenViewModel = function(rootSyntaxTree, editor, panel) {
    // Model
    this._root = rootSyntaxTree;
    this._tracesByTree = [];
    // ViewModel
    this._exploringMode = ko.observable(false);
    this.currentTreeIndex = ko.observable();
    this.currentTree = ko.computed({
      read: function() {
        var index = this.currentTreeIndex(); // we need to call the observable to trigger dependency
        return (typeof index === 'number') ? this._tracesByTree[index] : undefined;
      }.bind(this),
      deferEvaluation: true
    });

    this._currentLocation = ko.computed(function() {
      var tree = this.currentTree(); 
      if (!tree) return;
      return tree.location;
    }.bind(this));
    
    this.scopes = ko.computed(function() {
      var tree = this.currentTree();
      if (!tree)
        return;

      var scopesView = [];
      function appendView(location) {
        var clone = Querypoint.TokenViewModel._cloneEditorLineByLocation(editor, location);
        scopesView.push({scopeDeclaration: clone.outerHTML});
      }

      var scopeTree;
      if (tree.scope) {   // a declaration
        scopeTree = tree.scope.tree;
      } else {
        if (tree.declaration) {  // a ref
          appendView(tree.declaration.location);
          scopeTree = tree.declaration.scope.tree;
        }
      }
      
      while (scopeTree) {
        var location = scopeTree.location;
        appendView(location);
        scopeTree = scopeTree.parent;
      }
        
      return scopesView.reverse();  
    }.bind(this));
    
    this._currentExpression = ko.computed(function() {
      var location = this._currentLocation();
      if (!location) return "";
      
      var clone = Querypoint.TokenViewModel._cloneEditorLineByLocation(editor, location)
      var box = editor.createTokenBox(location);
      box.style.top = "0px";
      clone.appendChild(box);
      return clone.outerHTML;
    }.bind(this));
    
    this._currentOffsets = ko.computed({
      read: function() {
        var location = this._currentLocation()
        return location.start.offset + '-' + location.end.offset;
      }.bind(this),
      deferEvaluation: true
    });
    
    ko.applyBindings(this, document.querySelector('.tokenView'));

   $(".QPOutput").live("click", function(jQueryEvent) {
      console.log("Click ", jQueryEvent.target);
      var url = jQueryEvent.target.getAttribute('data-url');
      if (url) {
        panel.commands.openChainedEditor(url, editor);
      } // else the user did not click on something interesting.
    });
  }
  
  Querypoint.TokenViewModel._cloneEditorLineByLocation = function(editor, location) {
    var line = location.start.line;
    editor.setLineNumberClass(line, 'traceViewedLine');
    var traceViewedLine = document.querySelector('.traceViewedLine');
    editor.removeLineNumberClass(line, 'traceViewedLine');
    
    var clone = traceViewedLine.cloneNode(true);
    clone.classList.remove('traceViewedLine');
    return clone;
  }

  Querypoint.TokenViewModel.prototype = {

    setModel: function(tree) {

      var index = this._tracesByTree.indexOf(tree);
      if (index !== -1) {
        this.currentTreeIndex(index);
      } else {
        this.currentTreeIndex(this._tracesByTree.push(tree) - 1);
      }
    },
    
    setExploring: function(active) {
      this._exploringMode(active);
    },
    
  };
}());
