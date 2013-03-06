 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  'use strict';

  var debug = DebugLogger.register('FileViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });


  QuerypointPanel.FileViewModel = function(element, panel) {
    this._panel = panel;
      
    // These will be changed when the file we are viewing changes
    
    this.editor = ko.observable();
    this.sourceFile = ko.observable();
    this.treeRoot = ko.observable({traceData: function(){}});
    this.project = panel.project;

    this.tokenViewModel = new QuerypointPanel.TokenViewModel(this, panel);        // wired to editor token
    this.traceViewModel = new QuerypointPanel.TraceViewModel(this, panel);        // wired to token viewed
    this.queryProvider = new QuerypointPanel.TokenQueryProvider(this.tokenViewModel, this.project);  // wired to token viewed.
    this.queriesViewModel = new QuerypointPanel.QueriesViewModel(this.queryProvider, panel);  
    this.lineNumberViewModel = new QuerypointPanel.LineNumberViewModel(this, panel);

    this.currentLocation = ko.computed(function() {
      var tokenViewLocation = this.tokenViewModel.currentLocation();
      if (!this.traceViewModel.currentTraces())
        return tokenViewLocation;

      var traceViewLocation = this.traceViewModel.currentLocation();
      if (traceViewLocation === tokenViewLocation) 
        return traceViewLocation;
    }.bind(this));

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

    this.tokenViewModel.initialize();
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

      if (debug) console.log("FileViewModel.update "+this.editor().name);  
    },

    update: function(turn) {
      var tracequeries = this._panel.tracequeries();
      if (!tracequeries.length)
        return;
      
      this.tracepoints.removeAll();
        
      tracequeries.forEach(function(tq){
        tq.extractTracepoints(this, function (tracepoint){
          if (tracepoint) {
            this.tracepoints.push(tracepoint);
          } 
        }.bind(this));
      }.bind(this));    
      var lastTracequery = tracequeries[tracequeries.length - 1];  
      this.tokenViewModel.setTokenTree(lastTracequery.targetTree());
    }

  };

}());
