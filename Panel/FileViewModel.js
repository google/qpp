 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.FileViewModel = function(element, panel) {
    this._panel = panel;
      
    // These will be changed when the file we are viewing changes
    
    this.editor = ko.observable();
    this.sourceFile = ko.observable();
    this.treeRoot = ko.observable();
    this.project = panel.project;
        
    // Used by LineNumberViewModel and TraceViewModel, set by AllExpressionsTrace

    this.traceData = ko.observable();
    
    this.tokenViewModel = new QuerypointPanel.TokenViewModel(this, panel);  // wired to editor token
    this.traceViewModel = new QuerypointPanel.TraceViewModel(this, panel);    // wired to token viewed
    this.queriesViewModel = new QuerypointPanel.QueriesViewModel(this, panel);  // wired to token viewed.
    this.lineNumberViewModel = new QuerypointPanel.LineNumberViewModel(this, panel);

    // all of the query results for this file
    this.tracepoints = ko.observableArray();
    
    panel.currentTurnActive.subscribe(function(newValue) {
      console.log("FileViewModel update on turn "+newValue);
      if (newValue !== 0) {
        this.update(newValue);
      }
    }.bind(this));
    
    this.door = ko.computed(function() {      
      if (this.editor() && this.treeRoot()) {
        var hoverDoorChannel = document.querySelector('.fileViews .hoverDoorChannel');
        hoverDoorChannel.classList.remove('closed');
      }
    }.bind(this));
  }
  
  QuerypointPanel.FileViewModel.debug = false;
  
  QuerypointPanel.FileViewModel.prototype = {
    
    setModel: function(editor, sourceFile, treeRoot) {
      this.tokenViewModel.followTokens(false);
      if (this.editor()) 
        this.editor().hide();
      
      this.sourceFile(sourceFile);  
      this.treeRoot(treeRoot);
      this.editor(editor);   // editor last to ensure the new tree is consulted when we clone elements from the editor
         
      this.editor().show();
      this.tokenViewModel.followTokens(true);

      console.log("FileViewModel.update "+this.editor().name);  
    },

    checkTracePrompts: function(tree) {
      var traces = tree.location.traces;
      if (!traces) {
        return;
      }
      var prompts = tree.location.prompts;
      if (!prompts) {
        return;
      }

      prompts.forEach(function(prompt, promptIndex) {
        var drop = -1;
        traces.forEach(function(trace, index) {
          if (trace.query == prompt.query) {
            drop = promptIndex;
          }
        });
        if (drop !== -1) {
          tree.location.prompts.splice(promptIndex, 1); 
        }
      });
    },
    
    update: function(turn) {
      var treeRoot = this.treeRoot();
      if (treeRoot) {
        var tree = this.tokenViewModel.tokenTree();

        this._panel.tracequeries().forEach(function(tq){
          tq.extractTracepoints(this, tree, function (tracepoint){
            if (tracepoint) {
              this.tracepoints.push(tracepoint);
            } // else no data?
          }.bind(this));
        }.bind(this));
        this.checkTracePrompts(tree);
      }
    }

  };

}());
