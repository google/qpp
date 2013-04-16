 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Trace data

(function() {
  'use strict';

  var debug = DebugLogger.register('QuerypointViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.QuerypointViewModel = function(panel, sourceFile, editorViewModel) {
    this._panel = panel;
    this._editorViewModel = editorViewModel;
    
    this.sourceFile = ko.observable();
    this.treeRoot = ko.computed(function(){
      var sourceFile = this.sourceFile();
      var tree = {traceData: function(){}};
      if (sourceFile) {
        tree = panel.project.getTreeByName(sourceFile.name);
        if (tree && !tree.hasOwnProperty('traceData')) {
            // Used by LineNumberViewModel and TraceViewModel, set by AllExpressionsTrace
            tree.traceData = ko.observable();
        }
        this.tokenViewModel.followTokens(true);
      }
      return tree;
    }.bind(this));

    this.project = panel.project;
        
    this.tracepoints = ko.observableArray(); // all of the query results for this file

    this.tokenViewModel = new QuerypointPanel.TokenViewModel(this, this._editorViewModel, panel);        // wired to editor token
    this.traceViewModel = new QuerypointPanel.TraceViewModel(this, panel);        // wired to token viewed
    this.queryProvider = new QuerypointPanel.TokenQueryProvider(this.tokenViewModel, this.project);  // wired to token viewed.
    this.queriesViewModel = new QuerypointPanel.QueriesViewModel(this.queryProvider, panel);  
    this.lineNumberViewModel = new QuerypointPanel.LineNumberViewModel(this, editorViewModel, panel);

    this.currentLocation = ko.computed(function() {
      var tokenViewLocation = this.tokenViewModel.currentLocation();
      if (!this.traceViewModel.currentTraces())
        return tokenViewLocation;

      var traceViewLocation = this.traceViewModel.currentLocation();
      if (traceViewLocation === tokenViewLocation) 
        return traceViewLocation;
    }.bind(this));


    this._turnSubscription = panel.currentTurn.subscribe(function(newValue) {
      if (newValue !== 0) {
        this.update(newValue);
      }
    }.bind(this));
    
    this.door = ko.computed(function() {      
      if (this._hoverDoorTarget && this.treeRoot()) {
        var hoverDoorChannel = this._hoverDoorTarget.querySelector('.hoverDoorChannel');
        hoverDoorChannel.classList.remove('closed');
      }
    }.bind(this)).extend({ throttle: 1 });

    this.tokenViewModel.initialize();
    this.sourceFile(sourceFile);
  }
  
  QuerypointPanel.QuerypointViewModel.debug = true;
  
  QuerypointPanel.QuerypointViewModel.prototype = {
    hoverDoorAttach: function(hoverDoorTarget) {
      this._hoverDoorTarget = hoverDoorTarget;
    },

    update: function(turn) {
      var tracequeries = this._panel.tracequeries();
      if (!tracequeries.length)
        return;
      
      this.tracepoints = ko.observableArray([]);
        
      tracequeries.forEach(function(tq){
        tq.extractTracepoints(this, function (tracepoint){
          if (tracepoint) {
            this.tracepoints.push(tracepoint);
          } 
        }.bind(this), this._panel.logScrubber);
      }.bind(this));    
      var load = this._panel.logScrubber.showLoad();
      load.tracepoints = this.tracepoints;
      var lastTracequery = tracequeries[tracequeries.length - 1];  
      this.tokenViewModel.setTokenTree(lastTracequery.targetTree());
    },

    dispose: function() {
      this._turnSubscription.dispose(); //TODO avoiding this is exactly why we started using ko :-(
    }
  };

}());
