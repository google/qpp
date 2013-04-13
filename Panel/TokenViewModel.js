
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  "use strict";
  
  var debug = DebugLogger.register('TokenViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  QuerypointPanel.TokenViewModel = function(querypointViewModel, editorViewModel, panel) {
    this._querypointViewModel = querypointViewModel;
    this._editorViewModel = editorViewModel;

    this.tokenEvent = ko.observable();
    this.followTokens = ko.observable(false);

    this.followingTokens = ko.computed(function() {
      var editor = this.editor();
      if (editor) {
        if (this.followTokens()) {          
          if (!editor.hasListener('onTokenOver')) {
            editor.addListener('onTokenOver', this.tokenEvent);
            return true;
          }
        } else {
          editor.removeListener('onTokenOver', this.tokenEvent);
          return false;
        }  
      }
      
    }.bind(this));  // do not throttle
    
    this.setTokenTree = ko.observable();
    
    this.eventedTokenTree = ko.computed(function() {
      var tokenEvent = this.tokenEvent();
      if (!tokenEvent || !this._querypointViewModel.sourceFile())
          return; 
          
      var line = this.tokenEvent().start.line;
      var offsetOfLine = this._querypointViewModel.sourceFile().lineNumberTable.offsetOfLine(line);
      var tokenOffset = offsetOfLine + tokenEvent.start.column;
      var eventedTokenTree = this._querypointViewModel.project.treeFinder().byOffset(this._querypointViewModel.treeRoot(), tokenOffset);
      if (debug && eventedTokenTree) {
        var traces = eventedTokenTree.location.trace;
        var tokenLog = tokenEvent.token + '@' + tokenOffset + '-' + (offsetOfLine + tokenEvent.end.column);
        var treeEnd = eventedTokenTree.location.end.offset;
        var treeStart = eventedTokenTree.location.start.offset;
        var treeLog = eventedTokenTree.type + '@' + (treeEnd - 1) + '_' + (treeEnd - treeStart);
        var varIdLog =  traces ? " varId " + eventedTokenTree.location.varId : "";
        console.log("tokenEvent " + tokenLog + ' ' + treeLog + varIdLog, (traces ? traces : ''));
      } else if (debug) {
        console.warn("No tree at offset " + tokenOffset + ' for token ' + tokenLog);
      }
      this.setTokenTree(eventedTokenTree);
      return eventedTokenTree;
    }.bind(this));

    this.tokenTree = ko.computed(function(){
      var tokenTree = this.setTokenTree();
      if (tokenTree) {
        var tokenBoxData = {
          start: tokenTree.location.start, 
          end: tokenTree.location.end
        };
        this.editor().drawTokenBox(tokenBoxData);
      } 
      return tokenTree;
    }.bind(this)).extend({ throttle: 1 });

    this.currentLocation = ko.computed(function() {
      var tree = this.tokenTree(); 
      if (tree) 
        return tree.location;
    }.bind(this));
    
    this.currentLocationId = ko.computed(function(){
      var loc = this.currentLocation();
      if (loc) {
        var id = this.tokenTree().type;
        if (debug) {
          var end = loc.end.offset;
          var start = loc.start.offset;
          id += ': ' + (end - 1) + '_' + (end - start);
        }
        return id;  
      } else {
        return 'updating';
      }
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
          // It would be cool to highlight the declaration at tree.declaration.location;
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
    }.bind(this)).extend({ throttle: 1 });
  
    this.extraShowRight = 13 * 4;  // px
    
    this.pxToNumber = function(cssValue) {
      var pxIndex = cssValue.length - 2;
      var numbers = cssValue.substr(0, pxIndex);
      return parseInt(numbers, 10);
    } 
  
    this.expressionViewLeftOffset = function(boxEnd) {
      // Shift the token in the expression by leftOffset such that the end of the token
      // is extraShowRight from the rigth edge of viewWidth
      // endOffset + extraShowRight = leftOffset + viewWidth
      var hbox = $('.expressionView').closest('.hbox')[0];
      var viewWidth = hbox.clientWidth;
      var leftOffset = viewWidth - boxEnd - this.extraShowRight;
      return leftOffset < 0 ? leftOffset : 0;
    };
  }
  
  QuerypointPanel.TokenViewModel.prototype = {
    
    editor: function() {
      return this._editorViewModel.editor();
    },

    initialize: function() {
      // The QuerypointViewModel constructs the TokenViewModel; we use the querypointViewModel 
      // in computing currentExpression. Thus we cannot create the currentExpression
      // function in the TokenViewModel constructor, we have to wait until the 
      // querypointViewModel is constructed.
      this.currentExpression = ko.computed(function() {
        // only write the current expression once the entire view is synchronized.
        var location = this._querypointViewModel.currentLocation(); 
        if (!location) return "";
        
        var clone = this._cloneEditorLineByLocation(location);
        if (clone) {
          var box = this.editor().createTokenBox(location);
          box.style.top = "0px";
          clone.appendChild(box);
          clone.style.left = this.expressionViewLeftOffset(this.pxToNumber(box.style.left) + this.pxToNumber(box.style.width)) + 'px';
          return clone.outerHTML;
        } else {
          return "";
        }
      }.bind(this)).extend({throttle: 1});  // let both location and editor update
    },

    _cloneEditorLineByLocation: function(location) {
      var line = location.start.line;
      this.editor().setLineNumberClass(line, 'traceViewedLine');
      var traceViewedLine = document.querySelector('.traceViewedLine');
      this.editor().removeLineNumberClass(line, 'traceViewedLine');
      
      if (!traceViewedLine) {
          console.error("editor out of sync");
          return;
      }
      
      var clone = traceViewedLine.cloneNode(true);
      this._expressionFontSize = window.getComputedStyle(traceViewedLine).fontSize;
      clone.classList.remove('traceViewedLine');
      clone.classList.add('clonedEditorLine');
      return clone;
    }

  };
}());
