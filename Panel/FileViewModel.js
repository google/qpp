 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  
  QuerypointPanel.FileViewModel = function(editor, sourceFile, tree, panel) {
    this._editor = editor;
    this._sourceFile = sourceFile;
    this._tree = tree;
    this._project = panel.project;
    
    this.fileName = editor.name;
    
    this._tokenViewModel = new QuerypointPanel.TokenViewModel(this._tree, this._editor, panel);
    this._traceViewModel = new QuerypointPanel.TraceViewModel(this._tokenViewModel, panel);
    this._queryViewModel = new QuerypointPanel.QueryViewModel(this._tokenViewModel, this._project, this);
    this.treeHanger = new QuerypointPanel.TreeHangerTraceVisitor(this._project);
    
    editor.addListener('onViewportChange', this.updateViewport.bind(this));
    editor.addListener('onClickLineNumber', this.showTraceDataForLine.bind(this));
    
    this._initTokenFollower(tree);    
    this.updateViewport(editor.getViewport());
  }
  
  QuerypointPanel.FileViewModel.debug = false;
  

  
  QuerypointPanel.FileViewModel.prototype = {
    update: function() {
      this.updateTraceData(this.fileName, this.updateModel.bind(this, this.fileName));
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
        
        this._editor.removeLineNumberClass(line);
        if (!offsets) {
          this._editor.setLineNumberClass(line, 'qp-no-activations');
        } else {
          if (offsets.functionOffsets) {
            this._editor.setLineNumberClass(line, 'qp-activations');
          }
          if (offsets.expressionOffsets) { // overwrite function marker
            this._editor.setLineNumberClass(line, 'qp-traces');
          }
        }
      }

    },

    updateTraceData: function(fileName, callback) {
      chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"' + fileName + '\"]', callback);
    },
    
    updateModel: function(fileName, traceData) {
      console.log("updateModel " + fileName + " traceData: ", traceData);
      if (traceData) {
        if (this.treeHanger.visitTrace(this._tree, traceData)) {
          this._tokenViewModel.update();
        }
        this.traceModel = new QuerypointPanel.LineModelTraceVisitor(this._project, this._sourceFile);
        this.traceModel.visitTrace(this._tree, traceData);      
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
      var offsetOfLine = this._sourceFile.lineNumberTable.offsetOfLine(line);
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
            
            this._editor.insertElement(line, column, element, true);

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
      var offsetOfLine = this._sourceFile.lineNumberTable.offsetOfLine(line);
      var tokenOffset = offsetOfLine + tokenEvent.start.column;
      var tokenTree = this._project.treeFinder().byOffset(this._tree, tokenOffset);
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
        this._editor.drawTokenBox(tokenBoxData);
      } else {
        console.warn("No tree at offset " + tokenOffset + ' for token ' + tokenLog);
      }
    },
    
    _initTokenFollower: function(tree) {
      this.showToken = this.showToken.bind(this);
      var elementQPOutput = document.querySelector('.QPOutput');
      elementQPOutput.addEventListener('focus', function(event) {
        console.log("View focus "+this._editor.name, event);
        if (!this._editor.hasListener('onTokenOver')) {
          this._editor.addListener('onTokenOver', this.showToken);
          this._tokenViewModel.setExploring(true);
        }
      }.bind(this));
      elementQPOutput.addEventListener('blur', function(event) {
        console.log("View blur "+this._editor.name, event);
        this._editor.removeListener('onTokenOver', this.showToken);
        this._tokenViewModel.setExploring(false);
      }.bind(this));
      // Give focus to QPOutput after hide is removed, so the tokenOver starts active for discovery
      setTimeout(function(){
        elementQPOutput.focus();
      });
      // Show the program
      this._tokenViewModel.setModel(tree);
    },


  };

}());
