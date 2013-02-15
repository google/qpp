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
    this.treeRoot = ko.observable({traceData: function(){}});
    this.project = panel.project;
    
    this.tokenViewModel = new QuerypointPanel.TokenViewModel(this, panel);  // wired to editor token
    this.traceViewModel = new QuerypointPanel.TraceViewModel(this, panel);    // wired to token viewed
    this.queriesViewModel = new QuerypointPanel.QueriesViewModel(this, panel);  // wired to token viewed.
    this.lineNumberViewModel = new QuerypointPanel.LineNumberViewModel(this, panel);

    // all of the query results for this file
    this.tracepoints = ko.observableArray();
    
    panel.currentTurn.subscribe(function(newValue) {
      if (newValue !== 0) {
        this.update(newValue);
      }
    }.bind(this));
    
    this.door = ko.computed(function() {      
      if (this.editor() && this.treeRoot()) {
        var hoverDoorChannel = document.querySelector('.fileViews .hoverDoorChannel');
        hoverDoorChannel.classList.remove('closed');
      }
    }.bind(this)).extend({ throttle: 1 });
  }
  
  QuerypointPanel.FileViewModel.debug = true;
  
  QuerypointPanel.FileViewModel.prototype = {
    
    setModel: function(editor, sourceFile, treeRoot) {
      this.tokenViewModel.followTokens(false);
      if (this.editor()) 
        this.editor().hide();
      
      this.sourceFile(sourceFile);
      
      if (treeRoot && !treeRoot.hasOwnProperty('traceData')) {
          // Used by LineNumberViewModel and TraceViewModel, set by AllExpressionsTrace
          treeRoot.traceData = ko.observable();
      }
      this.treeRoot(treeRoot);
      this.editor(editor);   // editor last to ensure the new tree is consulted when we clone elements from the editor
         
      this.editor().show();
      if (treeRoot) 
        this.tokenViewModel.followTokens(true);

      console.log("FileViewModel.update "+this.editor().name);  
    },

    update: function(turn) {
      var treeRoot = this.treeRoot();
      if (treeRoot) {
        var treeInView = this.tokenViewModel.tokenTree();
        if (treeInView) {
          this.tracepoints.removeAll();
          this._panel.tracequeries().forEach(function(tq){
            tq.extractTracepoints(this, treeInView, function (tracepoint){
              if (tracepoint) {
                this.tracepoints.push(tracepoint);
              } // else no data?
              //console.log(this.tracepoints().length + ' tracepoints in turn ' + turn)
            }.bind(this));
          }.bind(this));
        }
      }
    }

  };

}());
