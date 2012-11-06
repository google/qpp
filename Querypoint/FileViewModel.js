 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  window.Querypoint = window.Querypoint || {};
  
  
  Querypoint.FileViewModel = function(editor, sourceFile, tree, panel) {
    this._editor = editor;
    this._sourceFile = sourceFile;
    this._tree = tree;
    
    this.fileName = editor.name;
    
    this._tokenViewModel = new Querypoint.TokenViewModel(this._tree, this._editor, panel);
    this._traceViewModel = new Querypoint.TraceViewModel(this._tokenViewModel, panel);
    this._queryViewModel = new Querypoint.QueryViewModel(this._tokenViewModel, panel.project);
    
    editor.addListener('onViewportChange', this.updateViewport.bind(this));
    editor.addListener('onClickLineNumber', this.showTraceDataForLine.bind(this));
    editor.addListener('onTokenOver', this.showToken.bind(this));
    editor.addListener('onExploreTraceMode', this.showExploreMode.bind(this));

    this.updateViewport(editor.getViewport());
  }
  
  Querypoint.FileViewModel.debug = false;
  
  Querypoint.FileViewModel.treeHanger = new Querypoint.TreeHangerTraceVisitor();
  
  Querypoint.FileViewModel.prototype = {
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
        Querypoint.FileViewModel.treeHanger.visitTrace(this._tree, traceData);
        this.traceModel = new Querypoint.LineModelTraceVisitor(this._sourceFile);
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
      var tokenTree = Querypoint.FindInTree.byOffset(this._tree, tokenOffset);
      if (tokenTree) {
        var traces = tokenTree.location.trace;
        if (Querypoint.FileViewModel.debug) {
          var tokenLog = tokenEvent.token + '@' + tokenOffset + '-' + (offsetOfLine + tokenEvent.end.column);
          var treeLog = tokenTree.type + '@' + tokenTree.location.start.offset + '-' + tokenTree.location.end.offset;
          var varIdLog =  traces ? " varId " + tokenTree.location.varId : "";
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
    
    showExploreMode: function(modeEvent) {
        this._tokenViewModel.setExploring(modeEvent.active);
    }
  };

}());
