// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Update the trace view output on the LHS of the editor when
// either the editor viewport or trace data changes

(function(){
  window.Querypoint = window.Querypoint || {};

  Querypoint.TraceViewModel = function(editor, sourceFile) {
    this._editor = editor;
    this._sourceFile = sourceFile;

    this.fileName = editor.name;

    this._visibleTraceData = ko.observableArray(); // 0 -> viewport start, max -> (viewport end - 1)
  
    editor.addListener('onViewportChange', this.updateViewport.bind(this));
  }

  Querypoint.TraceViewModel.prototype = {
    update: function() {

      this.updateTraceData(this.fileName, this.updateModel.bind(this, this.fileName));
    },
    getCurrentViewport: function() {
      return this._viewportData;
    },
    updateViewport: function(viewportData) {
      this._viewportData = viewportData;

      this.updateViewModel();
    },
    updateViewModel: function() {
      var i_viewport = 0;
      for(var line = this._viewportData.start; line < this._viewportData.end -1; line++, i_viewport++) {
        var activations = this.getTraceDataByLine(line);
        this._visibleTraceData()[i_viewport] = activations;
        this._editor.clearMarker(line);
        if (!activations) {
          this._editor.setMarker(line, undefined, 'qp-no-tracing');
        } else {
          this._editor.setMarker(line, undefined, 'qp-activations');
        }
      }
      console.log("You've got data ", this._visibleTraceData());
    },
    updateTraceData: function(fileName, callback) {
      chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"'+fileName+'\"]', callback);
    },
    updateLineTable: function() {
      var offsets = Object.keys(this.traceData);
      this._offsetsByLine = {};
      offsets.forEach(function(offset) {
        var line = this._sourceFile.lineNumberTable.getLine(offset);
        this._offsetsByLine[line] = this._offsetsByLine[line] || [];
        this._offsetsByLine[line].push(offset);
      }.bind(this));
    },
    updateModel: function(fileName, traceData) {
      console.log("updateModel "+fileName+" traceData: ", traceData);
      this.traceData = traceData;
      this.updateLineTable();
      this.updateViewModel();
    },
    getTraceDataByLine: function(line) {
      if (this._offsetsByLine) {
        var offsets = this._offsetsByLine[line];
        if (offsets) {
          return offsets.map(function(offset){
            return this.traceData[offset];
          }.bind(this));
        }
      }
    }
  };

}());