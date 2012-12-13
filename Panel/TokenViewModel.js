
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TokenViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;

    this.tokenEvent = ko.observable();
    this.followTokens = ko.observable(false);

    this.followingTokens = ko.computed(function() {
      if (!this._fileViewModel.editor()) {
          return false;
      }
      if (this.followTokens()) {          
        if (!this._fileViewModel.editor().hasListener('onTokenOver')) {
          this._fileViewModel.editor().addListener('onTokenOver', this.tokenEvent);
          return true;
        }
      } else {
        this._fileViewModel.editor().removeListener('onTokenOver', this.tokenEvent);
        return false;
      }

    }.bind(this));
    
    this.tokenTree = ko.computed(function() {
      var tokenEvent = this.tokenEvent();
      if (!tokenEvent || !this._fileViewModel.sourceFile())
          return; 
          
      var line = this.tokenEvent().start.line;
      var offsetOfLine = this._fileViewModel.sourceFile().lineNumberTable.offsetOfLine(line);
      var tokenOffset = offsetOfLine + tokenEvent.start.column;
      var tokenTree = this._fileViewModel.project.treeFinder().byOffset(this._fileViewModel.treeRoot(), tokenOffset);
      if (tokenTree) {
        var traces = tokenTree.location.trace;
        if (QuerypointPanel.TokenViewModel.debug) {
          var tokenLog = tokenEvent.token + '@' + tokenOffset + '-' + (offsetOfLine + tokenEvent.end.column);
          var treeLog = tokenTree.type + '@' + tokenTree.location.start.offset + '-' + tokenTree.location.end.offset;
          var varIdLog =  traces ? " varId " + tokenTree.location.varId : "";
          if (QuerypointPanel.FileViewModel.debug) 
            console.log("tokenEvent " + tokenLog + ' ' + treeLog + varIdLog, (traces ? traces : ''));
        }

        var tokenBoxData =  {
          token: tokenEvent.token, 
          start: tokenTree.location.start, 
          end: tokenTree.location.end
        };
        this._fileViewModel.editor().drawTokenBox(tokenBoxData);
      } else {
        console.warn("No tree at offset " + tokenOffset + ' for token ' + tokenLog);
      }
      return tokenTree;
    }.bind(this));

    this._currentLocation = ko.computed(function() {
      var tree = this.tokenTree(); 
      if (!tree) return;
      return tree.location;
    }.bind(this));
    
    this.scopes = ko.computed(function() {
      var tree = this.tokenTree();
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
      
      var clone = this._cloneEditorLineByLocation(location);
      if (clone) {
        var box = this._fileViewModel.editor().createTokenBox(location);
        box.style.top = "0px";
        clone.appendChild(box);
        return clone.outerHTML;
      } else {
        return "";
      }
    }.bind(this)).extend({throttle: 50 });  // let both location and editor update
  
  }


  QuerypointPanel.TokenViewModel.prototype = {

    _cloneEditorLineByLocation: function(location) {
      var line = location.start.line;
      this._fileViewModel.editor().setLineNumberClass(line, 'traceViewedLine');
      var traceViewedLine = document.querySelector('.traceViewedLine');
      this._fileViewModel.editor().removeLineNumberClass(line, 'traceViewedLine');
      
      if (!traceViewedLine) {
          console.error("editor out of sync");
          return;
      }
      
      var clone = traceViewedLine.cloneNode(true);
      clone.classList.remove('traceViewedLine');
      return clone;
    }

  };
}());
