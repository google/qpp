 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Updates the editor line number decorations

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.LineNumberViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;
  }
  
  QuerypointPanel.LineNumberViewModel.debug = false;
  
  QuerypointPanel.LineNumberViewModel.prototype = {

    reattach: function(editor, sourceFile) {
        this.traceVisitor = this._fileViewModel.project.lineModelTraceVisitor(sourceFile);
        if (this.editor) 
           this.editor.removeListener('onClickLineNumber', this.showTraceDataForLine.bind(this));
        this.editor = editor;
        this.editor.addListener('onClickLineNumber', this.showTraceDataForLine.bind(this));
    },

    // Manually update to avoid having ko.observables() all over the tree
    update: function(traceData, viewportData) {
        this.traceVisitor.visitTrace(this._fileViewModel.treeRoot(), traceData);
        this.updateLineNumberHighlights(viewportData);
    },
    
    updateLineNumberHighlights: function(viewportData) {      
      var i_viewport = 0;
      // Use the viewport to limit our work
      for (var line = viewportData.start; line < viewportData.end; line++, i_viewport++) {
        var offsets = this.getTracedOffsetByLine(line);
        
        this.editor.removeLineNumberClass(line);
        if (!offsets) {
          this.editor.setLineNumberClass(line, 'qp-no-activations');
        } else {
          if (offsets.functionOffsets) {
            this.editor.setLineNumberClass(line, 'qp-activations');
          }
          if (offsets.expressionOffsets) { // overwrite function marker
            this.editor.setLineNumberClass(line, 'qp-traces');
          }
        }
      }

    },

    getTracedOffsetByLine: function(line) {
      return this.traceVisitor.tracedOffsetsByLine[line];
    },

    getTraceByOffset: function(offset) {
      return this.traceVisitor.latestTraceByOffset[offset];
    },

    showTraceDataForLine: function(clickData) {
      var line = clickData.line;
      var offsetOfLine = this.sourceFile.lineNumberTable.offsetOfLine(line);
      var offsets = this.getTracedOffsetByLine(line);
      if (offsets) {
        var expressionOffsets = offsets.expressionOffsets;
        if (expressionOffsets) {
          expressionOffsets.forEach(function(offset, index) {
            var trace = this.getTraceByOffset(offset);
            var column = parseInt(offset) - offsetOfLine;
            var element = this.getTraceDataElement(line, column, index, trace);
            this.editor.insertElement(line, column, element, true);
          }.bind(this));
        }
      }
    },

    getTraceDataElement: function(line, column, index, trace) {
      var traceDataElement = document.createElement('span');
      traceDataElement.classList.add('traceData');
      traceDataElement.innerHTML = trace; // TODO chop 50
      if (column < 50) { // then position text to the right
        traceDataElement.classList.add('indicatorLeft');
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

  };

}());
