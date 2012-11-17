
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TokenViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;

    this._cacheTracesByTree = [];
    // ViewModel
    this.currentTreeIndex = ko.observable();
    this.currentTree = ko.computed({
      read: function() {
        var index = this.currentTreeIndex(); // we need to call the observable to trigger dependency
        return (typeof index === 'number') ? this._cacheTracesByTree[index] : undefined;
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
      var viewModel = this;
      function appendView(location) {
        var clone = viewModel._cloneEditorLineByLocation(location);
        scopesView.push({scopeDeclaration: clone.outerHTML});
      }

      var scope;
      if (tree.scope) {   // a declaration
        scope = tree.scope;
      } else {
        if (tree.declaration) {  // a ref
          appendView(tree.declaration.location);
          scope = tree.declaration.scope;
        }
      }
      
      while (scope) {
        var scopeTree = scope.tree;
        var location = scopeTree.location;
        if (scopeTree.type !== "PROGRAM") {

          appendView(location);
        }
        scope = scope.parent;
      }

      scopesView.push({scopeDeclaration: '<div class="fileScope">' + tree.location.start.source.name + '</div>'});
        
      return scopesView.reverse();  
    }.bind(this));
    
    this._currentExpression = ko.computed(function() {
      var location = this._currentLocation();
      if (!location) return "";
      
      var clone = this._cloneEditorLineByLocation(location)
      var box = this._fileViewModel.editor().createTokenBox(location);
      box.style.top = "0px";
      clone.appendChild(box);
      return clone.outerHTML;
    }.bind(this));
 
    ko.applyBindings(this, document.querySelector('.tokenView'));

   $(".QPOutput").live("click", function(jQueryEvent) {
      console.log("Click ", jQueryEvent.target);
      jQueryEvent.target.focus();
      var url = jQueryEvent.target.getAttribute('data-url');
      if (url) {
        panel.commands.openChainedEditor(url, this._fileViewModel.editor());
      } // else the user did not click on something interesting.
    });
  }


  QuerypointPanel.TokenViewModel.prototype = {

    setModel: function(tree) {
      var index = this._cacheTracesByTree.indexOf(tree);
      if (index !== -1) {
        this.currentTreeIndex(index);
      } else {
        this.currentTreeIndex(this._cacheTracesByTree.push(tree) - 1);
      }
    },
    
    setExploring: function(active) {
      QuerypointPanel.BuffersStatusBar.exploringMode(active);
    },
    
    // Force ko 
    update: function() {
      this.currentTreeIndex.valueHasMutated();
    },

    _cloneEditorLineByLocation: function(location) {
      var line = location.start.line;
      this._fileViewModel.editor().setLineNumberClass(line, 'traceViewedLine');
      var traceViewedLine = document.querySelector('.traceViewedLine');
      this._fileViewModel.editor().removeLineNumberClass(line, 'traceViewedLine');
      
      var clone = traceViewedLine.cloneNode(true);
      clone.classList.remove('traceViewedLine');
      return clone;
    }

  };
}());
