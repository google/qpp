 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Updates the editor line number decorations

(function() {

  QuerypointPanel.LineNumberViewModel = function(querypointViewModel, editorViewModel, panel) {
    this._querypointViewModel = querypointViewModel;
    this._editorViewModel = editorViewModel;
    
    this._viewportRange = ko.observable();
    
    this._editor = ko.computed(function() {
      if (this._editorListenedTo && this._editorListenedTo.hasListener('onViewportChange')) {
        this._editorListenedTo.removeListener('onViewportChange');
      }
      this._editorListenedTo = this._editorViewModel.editor();
      if (this._editorListenedTo) {
        this._editorListenedTo.addListener('onViewportChange', this.updateViewport.bind(this));
        this.updateViewport(this._editorListenedTo.getViewport());
      }
      return this._editorListenedTo;
    }.bind(this));
    
    this._lineModel = ko.computed(function(){
      var treeRoot = this._querypointViewModel.treeRoot();
      var traceData = treeRoot && treeRoot.traceData();
        
      var tracesByLine = [];
      if (traceData)
        this._visitTraceData(traceData, tracesByLine);
      this._visitTracepoints(this._querypointViewModel.tracepoints(), tracesByLine);
      return tracesByLine;
    }.bind(this)).extend({ throttle: 1 });
    
    this.updateLineNumberHighlights = ko.computed(function() {
      var tracesByLine = this._lineModel();
      if (!tracesByLine.length) {
        return;
      }
      var editor = this._editor();
      if (!editor)
        return;
        
      var i_viewport = 0;
      var viewportRange = this._viewportRange();
      // Use the viewport to limit our work
      for (var line = viewportRange.start; line < viewportRange.end; line++, i_viewport++) {
        var traces = tracesByLine[line];
        editor.removeLineNumberClass(line);
        if (!traces) {
          editor.setLineNumberClass(line, 'qp-no-activations');
        } else {
          traces.forEach(function(trace) {
            if (trace.activation) {
              editor.setLineNumberClass(line, 'qp-activations');
            }
            if (trace.value) { // overwrite function marker
              editor.setLineNumberClass(line, 'qp-traces');
            }            
          });
        }
      }
    }.bind(this)).extend({ throttle: 1 });
  }

  
  QuerypointPanel.LineNumberViewModel.prototype = {
      
    updateViewport: function(viewportRange) {
      this._viewportRange(viewportRange);
    },
        
    _visitTraceData: function(traceData, tracesByLine) {
      var visitor = this._querypointViewModel.project.lineModelTraceVisitor(this._querypointViewModel.sourceFile());
      visitor.tracesByLine = tracesByLine;
      visitor.visitTrace(this._querypointViewModel.treeRoot(), traceData);
    },
    
    _tracepointIsOnTree: function(tracepoint, tree) {
      var treeFileName = tree.location.start.source.name;
      return (treeFileName === tracepoint.file);
    },
    
    _mapOffsetsToLineNumbers: function(tracepoint, tree, tracesByLine) {
      var offset = parseInt(tracepoint.startOffset, 10);
      var lineNumberTable = tree.location.start.source.lineNumberTable
      var line = lineNumberTable.getLine(offset);
      var col = offset - lineNumberTable.offsetOfLine(line);
      tracepoint.line = line;
      tracepoint.column = col;
      tracesByLine[line] = tracesByLine[line] || [];
      tracesByLine[line].push(tracepoint);
    },
    
    _visitTracepoints: function(tracepoints, tracesByLine) {
      tracepoints.forEach(function(tracepoint) {
        var tree = this._querypointViewModel.treeRoot();
        if (this._tracepointIsOnTree(tracepoint, tree)) {
          this._mapOffsetsToLineNumbers(tracepoint, tree, tracesByLine);
        }
      }.bind(this));
    }    

  };

}());
