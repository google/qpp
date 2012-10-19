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
    editor.addListener('onClickLineNumber', this.showTraceDataForLine.bind(this));
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

      if (this.traceModel) {
        this.updateViewModel();
      }
    },
    updateViewModel: function() {
      var i_viewport = 0;
      // Use the viewport to limit our work
      for(var line = this._viewportData.start; line < this._viewportData.end; line++, i_viewport++) {
        var offsets = this.getTracedOffsetByLine(line);

        this._editor.clearMarker(line);
        if (!offsets) {
          this._editor.setMarker(line, undefined, 'qp-no-activations');
        } else {
          if (offsets.functionOffsets) {
            this._editor.setMarker(line, undefined, 'qp-activations');  
          }
          if (offsets.expressionOffsets) { // overwrite function marker
             this._editor.setMarker(line, undefined, 'qp-traces'); 
          }
        }
      }
      console.log("You've got data ", this._visibleTraceData());
    },
    updateTraceData: function(fileName, callback) {
      chrome.devtools.inspectedWindow.eval('window.__qp.functions[\"'+fileName+'\"]', callback);
    },
    latestTraceModel: function(traceData) {
      var functionDefinitionOffsets = Object.keys(traceData);
      var tracedOffsetsByLine = {};
      var latestTraceByOffset = {};
      functionDefinitionOffsets.forEach(function(functionDefinitionOffset) {
        var line = this._sourceFile.lineNumberTable.getLine(functionDefinitionOffset);
        tracedOffsetsByLine[line] = tracedOffsetsByLine[line] || {};
        
        tracedOffsetsByLine[line].functionOffsets = tracedOffsetsByLine[line].functionOffsets || [];
        tracedOffsetsByLine[line].functionOffsets.push(functionDefinitionOffset);

        var activations = traceData[functionDefinitionOffset];
        if (activations.length) {
          var latestActivation = activations[activations.length - 1];
          var tracedExpressionIds = Object.keys(latestActivation);
          tracedExpressionIds.forEach(function(id) {
            if (id === 'turn') return; // TODO
            var offset = id.split('_')[1]; // [0] is the revision number TODO
            var line = this._sourceFile.lineNumberTable.getLine(offset);
            tracedOffsetsByLine[line] = tracedOffsetsByLine[line] || {};
            tracedOffsetsByLine[line].expressionOffsets = tracedOffsetsByLine[line].expressionOffsets || [];
            tracedOffsetsByLine[line].expressionOffsets.push(offset);
            latestTraceByOffset[offset] = latestActivation[id];
          }.bind(this));
        }

      }.bind(this));
      return {tracedOffsetsByLine: tracedOffsetsByLine, latestTraceByOffset: latestTraceByOffset};
    },
    updateModel: function(fileName, traceData) {
      console.log("updateModel "+fileName+" traceData: ", traceData);
      this.traceData = traceData;
      this.traceModel = this.latestTraceModel(traceData);
      this.updateViewModel();
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

          expressionOffsets.forEach(function(offset, index){
            var trace = this.getTraceByOffset(offset);
            console.log("showTraceDataForLine "+line+" offset "+offset+" = "+trace);
            var element = this.getTraceDataElement(offset, index, trace);
            var column = parseInt(offset) - offsetOfLine - trace.length;
            this._editor.insertElement({line: line+index, ch: column}, element, true);
            this._editor.setLineClass(line+index+1, 'traceBackground', 'traceBackground');
          }.bind(this));
        }
      }
    },
    getTraceDataElement: function(offset, index, trace) {
        var element = document.createElement('div');
        element.classList.add('traceData');
        element.style.zIndex = 10 + index;
        element.innerHTML = trace;
        return element;
    },
    getTraceBackground: function(heightInLines) {
        var element = document.createElement('div');
        element.style.height = heightInLines + 'em';
        element.classList.add('traceBackground');
        return element;
    }
  };

}());