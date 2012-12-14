 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Updates the editor line number decorations

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.LineNumberViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;
    
    this._viewportData = ko.observable();
    
    this.traceVisitor = ko.computed(function() {
        var editor = this._fileViewModel.editor();
        if (editor) {  // TODO where is the remove?
          editor.addListener('onViewportChange', this.updateViewport.bind(this));
          this.updateViewport(editor.getViewport());
        }
        return this._fileViewModel.project.lineModelTraceVisitor(this._fileViewModel.sourceFile());
    }.bind(this));
    
    this.lineModel = ko.computed(function(){
      var traceData = this._fileViewModel.treeRoot().traceData();
      if(!traceData)
        return;
        
      var visitor = this.traceVisitor();
      visitor.visitTrace(this._fileViewModel.treeRoot(), traceData);
      return {
        tracedOffsetsByLine: visitor.tracedOffsetsByLine,
        latestTraceByOffset: visitor.latestTraceByOffset
      };
    }.bind(this)).extend({ throttle: 1 });
    
    this.updateLineNumberHighlights = ko.computed(function() {
      if (!this.lineModel()) {
        return;
      }      
      var i_viewport = 0;
      var viewportData = this._viewportData();
      var editor = this._fileViewModel.editor();
      // Use the viewport to limit our work
      for (var line = viewportData.start; line < viewportData.end; line++, i_viewport++) {
        var offsets = this.getTracedOffsetByLine(line);
        
        editor.removeLineNumberClass(line);
        if (!offsets) {
          editor.setLineNumberClass(line, 'qp-no-activations');
        } else {
          if (offsets.functionOffsets) {
            editor.setLineNumberClass(line, 'qp-activations');
          }
          if (offsets.expressionOffsets) { // overwrite function marker
            editor.setLineNumberClass(line, 'qp-traces');
          }
        }
      }
    }.bind(this)).extend({ throttle: 1 });
  }
  
  QuerypointPanel.LineNumberViewModel.debug = false;
  
  QuerypointPanel.LineNumberViewModel.prototype = {
      
    updateViewport: function(viewportData) {
      this._viewportData(viewportData);
    },

    // Manually update to avoid having ko.observables() all over the tree
    update: function(traceData, viewportData) {
        this.traceVisitor.visitTrace(this._fileViewModel.treeRoot(), traceData);
        this.updateLineNumberHighlights(viewportData);
    },

    getTracedOffsetByLine: function(line) {
      return this.lineModel().tracedOffsetsByLine[line];
    },

    getTraceByOffset: function(offset) {
      return this.lineModel().latestTraceByOffset[offset];
    },

    showTraceDataForLine: function(clickData) {
      var line = clickData.line;
      var offsetOfLine = this._fileViewModel.sourceFile().lineNumberTable.offsetOfLine(line);
      var offsets = this.getTracedOffsetByLine(line);
      if (offsets) {
        var expressionOffsets = offsets.expressionOffsets;
        if (expressionOffsets) {
          expressionOffsets.forEach(function(offset, index) {
            var trace = this.getTraceByOffset(offset);
            var column = parseInt(offset) - offsetOfLine;
            var element = this.getTraceDataElement(line, column, index, trace);
            editor.insertElement(line, column, element, true);
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
