 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.FileViewModel = function(element, panel) {
    // These will be changed when the file we are viewing changes
    this.editor = ko.observable();
    this.sourceFile = ko.observable();
    this.treeRoot = ko.observable();
    this.project = panel.project;
    
    this.tokenViewModel = new QuerypointPanel.TokenViewModel(this, panel);  // wired to editor token
    this.traceViewModel = new QuerypointPanel.TraceViewModel(this, panel);    // wired to token viewed
    this.queriesViewModel = new QuerypointPanel.QueriesViewModel(this, panel);  // wired to token viewed.
    this.lineNumberViewModel = new QuerypointPanel.LineNumberViewModel(this, panel);
    
    panel.currentTurnActive.subscribe(function(newValue) {
      console.log("FileViewModel update on turn "+newValue);
      if (!newValue) {
        this.update();
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

      this.updateViewport(editor.getViewport()); // TODO ko
      this.lineNumberViewModel.reattach(this.editor(), this.sourceFile());
      
      editor.addListener('onViewportChange', this.updateViewport.bind(this));

      console.log("FileViewModel.update "+this.editor().name);  
    },

    update: function() {
      if (this.editor() && this.treeRoot()) {
        this.updateTraceData(this.editor().name, this.updateModel.bind(this));
        var hoverDoorChannel = document.querySelector('.fileViews .hoverDoorChannel');
        hoverDoorChannel.classList.remove('closed');
      }
    },

    getCurrentViewport: function() {
      return this._viewportData;
    },

    updateViewport: function(viewportData) {
      this._viewportData = viewportData;
      
      if (this.traceModel) {
        this.updateLineNumberHighlights();
      }
    },

    updateTraceData: function(fileName, callback) {
      chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"' + fileName + '\"]', callback);
    },
    
    updateModel: function(traceData) {
      console.log("updateModel " + this.editor().name + " traceData: ", traceData);
      if (traceData) {      
        this.lineNumberViewModel.update(traceData, this.getCurrentViewport());
        this.traceViewModel.update(traceData);
      }
    },

  };

}());
