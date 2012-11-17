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
    
    this._tokenViewModel = new QuerypointPanel.TokenViewModel(this, panel);
    this._traceViewModel = new QuerypointPanel.TraceViewModel(this._tokenViewModel, panel);
    this._queryViewModel = new QuerypointPanel.QueryViewModel(this._tokenViewModel, this.project, this);

    this.treeHanger = new QuerypointPanel.TreeHangerTraceVisitor(this.project);
    
    this.fileInfoView = element.querySelector('.focusBlock');

    
    this._fileInfoViewFocused = ko.observable(false);
    this.tokenFollower = ko.computed(this._tokenFollower.bind(this));

    this._initTokenFollower();    
  }
  
  QuerypointPanel.FileViewModel.debug = false;
  
  QuerypointPanel.FileViewModel.prototype = {
    
    setModel: function(editor, sourceFile, treeRoot) {
      this.fileInfoView.blur();
      if (this.editor()) 
        this.editor().hide();
      
      this.sourceFile(sourceFile);  
      this.treeRoot(treeRoot);
      this.editor(editor);   // editor last to ensure the new tree is consulted when we clone elements from the editor
         
      this.editor().show();
      this.fileInfoView.focus();
 
      this.updateViewport(editor.getViewport()); // TODO ko
      editor.addListener('onViewportChange', this.updateViewport.bind(this));
      editor.addListener('onClickLineNumber', this.showTraceDataForLine.bind(this));

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
        this.updateViewModel();
      }
    },

    // Manually update to avoid having ko.observables() all over the tree
    updateViewModel: function() {
      var i_viewport = 0;
      // Use the viewport to limit our work
      for (var line = this._viewportData.start; line < this._viewportData.end; line++, i_viewport++) {
        var offsets = this.getTracedOffsetByLine(line);
        
        this.editor().removeLineNumberClass(line);
        if (!offsets) {
          this.editor().setLineNumberClass(line, 'qp-no-activations');
        } else {
          if (offsets.functionOffsets) {
            this.editor().setLineNumberClass(line, 'qp-activations');
          }
          if (offsets.expressionOffsets) { // overwrite function marker
            this.editor().setLineNumberClass(line, 'qp-traces');
          }
        }
      }

    },

    updateTraceData: function(fileName, callback) {
      chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"' + fileName + '\"]', callback);
    },
    
    updateModel: function(traceData) {
      console.log("updateModel " + this.editor().name + " traceData: ", traceData);
      if (traceData) {
        if (this.treeHanger.visitTrace(this.treeRoot(), traceData)) {
          this._tokenViewModel.update();
        }
        this.traceModel = new QuerypointPanel.LineModelTraceVisitor(this.project, this.sourceFile());
        this.traceModel.visitTrace(this.treeRoot(), traceData);      
        this.updateViewModel();
      }
    },

    getTracedOffsetByLine: function(line) {
      return this.traceModel.tracedOffsetsByLine[line];
    },

    getTraceByOffset: function(offset) {
      return this.traceModel.latestTraceByOffset[offset];
    },

    showTraceDataForLine: function(clickData) {
      var line = clickData.line;
      var offsetOfLine = this.sourceFile().lineNumberTable.offsetOfLine(line);
      var offsets = this.getTracedOffsetByLine(line);
      if (offsets) {
        var expressionOffsets = offsets.expressionOffsets;
        if (expressionOffsets) {
          
          expressionOffsets.forEach(function(offset, index) {
            var trace = this.getTraceByOffset(offset);
            if (QuerypointPanel.FileViewModel.debug) 
              console.log("showTraceDataForLine " + line + " offset " + offset + " = " + trace);
            var column = parseInt(offset) - offsetOfLine;
            var element = this.getTraceDataElement(line, column, index, trace);
            
            this.editor().insertElement(line, column, element, true);

          }.bind(this));
        }
      }
    },

    getTraceDataElement: function(line, column, index, trace) {
      var traceDataElement = document.createElement('span');
      traceDataElement.classList.add('traceData');
      traceDataElement.innerHTML = trace; // TODO chop 50
      if (column < 50) { // then position text to the right
        traceDataElement.classList.add('indicatorLeft');s
      } else { // to the left
        traceDataElement.classList.add('indicatorRight');
      }
      return traceDataElement;
    },

    getTraceBackground: function(heightInLines) {
      var element = document.createElement('div');
      element.style.height = heightInLines + 'em';
      element.classList.add('traceBackground');
      return element;
    },

    showToken: function(tokenEvent) {  
      var line = tokenEvent.start.line;
      var offsetOfLine = this.sourceFile().lineNumberTable.offsetOfLine(line);
      var tokenOffset = offsetOfLine + tokenEvent.start.column;
      var tokenTree = this.project.treeFinder().byOffset(this.treeRoot(), tokenOffset);
      if (tokenTree) {
        var traces = tokenTree.location.trace;
        if (QuerypointPanel.FileViewModel.debug) {
          var tokenLog = tokenEvent.token + '@' + tokenOffset + '-' + (offsetOfLine + tokenEvent.end.column);
          var treeLog = tokenTree.type + '@' + tokenTree.location.start.offset + '-' + tokenTree.location.end.offset;
          var varIdLog =  traces ? " varId " + tokenTree.location.varId : "";
          if (QuerypointPanel.FileViewModel.debug) 
            console.log("showToken " + tokenLog + ' ' + treeLog + varIdLog, (traces ? traces : ''));
        }
        this._tokenViewModel.setModel(tokenTree);
        var tokenBoxData =  {
          token: tokenEvent.token, 
          start: tokenTree.location.start, 
          end: tokenTree.location.end
        };
        this.editor().drawTokenBox(tokenBoxData);
      } else {
        console.warn("No tree at offset " + tokenOffset + ' for token ' + tokenLog);
      }
    },
    
    _tokenFollower: function() {
      if (!this.editor()) {
          return;
      }
      if (this._fileInfoViewFocused()) {          
        if (!this.editor().hasListener('onTokenOver')) {
          this.editor().addListener('onTokenOver', this.showToken);
          this._tokenViewModel.setExploring(true);
        }
      } else {
        this.editor().removeListener('onTokenOver', this.showToken);
        this._tokenViewModel.setExploring(false);
      }
    },
        
    _initTokenFollower: function() {
      
      this.showToken = this.showToken.bind(this);
      
      this.fileInfoView.addEventListener('focus', function(event) {
        if (this.editor()) {
          console.log("View focus "+this.editor().name, event);
          this._fileInfoViewFocused(true);
        }
      }.bind(this));
      
      this.fileInfoView.addEventListener('blur', function(event) {
        if (this.editor()) {
          console.log("View blur "+this.editor().name, event);
          this._fileInfoViewFocused(false);

        }
      }.bind(this));

      
    },


  };

}());
