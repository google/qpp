 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  window.Querypoint = window.Querypoint || {};
  
  Querypoint.TraceVisitor = function() {
  }
  
  Querypoint.TraceVisitor.prototype = {
    visitTrace: function(tree, traceData) {
      var functionDefinitionOffsetKeys = Object.keys(traceData);
      functionDefinitionOffsetKeys.forEach(function(functionDefinitionOffsetKey) {
        var functionDefinitionTree;
        if (functionDefinitionOffsetKey === 'file') {
          functionDefinitionTree = tree;
        } else {
          var functionDefinitionOffset = parseInt(functionDefinitionOffsetKey, 10);
          functionDefinitionTree = Querypoint.FindInTree.byOffset(tree, functionDefinitionOffset);
        }
        if (functionDefinitionTree) {
          var activations = traceData[functionDefinitionOffsetKey];
          if (activations.length) {
            this.visitFunctionTraced(functionDefinitionTree, activations);
          }
        }
      // else no call comes to visit* functions.
      }.bind(this));
    },
    visitFunctionTraced: function(functionTree, activations) {
      var turn = 0;
      var activationInThisTurn = 0;
      activations.forEach(function(activation, index) {
        activationInThisTurn += 1;
        if (activation.turn !== turn) {
          // The activations are all in one array, ordered by turn. 
          // Reset the counter for activation in this turn when the turn number changes.
          activationInThisTurn = 1;
        }
        this.visitActivationTraced(functionTree, activation, activationInThisTurn);
      }.bind(this));
    },
    _findInTree: function(tree, id) {
      var offsetKey = id.split('_')[1]; // [0] is the revision number TODO
      var offset = parseInt(offsetKey, 10);
      function byOffsetKey(offset, tree){
        var loc = tree.location;
        if (loc) {
          var startOffset = loc.start.offset;
          var endOffset = loc.end.offset - 1;
          if (startOffset <= offset && offset <= endOffset) {
            return (loc.traceId === id) ? 0 : (endOffset - startOffset + 1);
          }
        }
      }
      return Querypoint.FindInTree.findByDistanceFunction(tree, byOffsetKey.bind(this, offset));
    },
    visitActivationTraced: function(functionTree, activation, activationCount) {
      var tracedExpressionIds = Object.keys(activation);
      tracedExpressionIds.forEach(function(id) {
        if (id === 'turn')
          return;

        var trace = activation[id];
        // TODO need to match offsetKey in find() 
        var expressionTree = this._findInTree(functionTree, id);
        this.visitExpressionsTraced(expressionTree, activation.turn, activationCount, trace);
      }.bind(this));
    },
    visitExpressionsTraced: function(expressionTree, turn, activationCount, trace) {
      console.log("Visiting " + traceur.outputgeneration.TreeWriter.write(tree) + ' with trace ' + trace);
    }
  };

  //--------------------------------------------------------------------------------------------------------------------------------------------------------
  // Attach traceData to the appropriate subtree
  Querypoint.TreeHangerTraceVisitor = function() {
  
  }
  Querypoint.TreeHangerTraceVisitor.prototype = Object.create(Querypoint.TraceVisitor.prototype);
  Querypoint.TreeHangerTraceVisitor.prototype.visitExpressionsTraced = function(expressionTree, turn, activationCount, trace) {
    if (expressionTree.location) {
      expressionTree.location.trace = expressionTree.location.trace || [];
      expressionTree.location.trace.push({
        turn: turn,
        activation: activationCount,
        value: trace
      });
    } else {
      console.error("Trace with no location", expressionTree);
    }
  }

  //---------------------------------------------------------------------------
  // Create line-table info for UI showing where trace data may be hiding
  
  Querypoint.LineModelTraceVisitor = function(sourceFile) {
    this._sourceFile = sourceFile;
    this.tracedOffsetsByLine = {};
    this.latestTraceByOffset = {};
  }
  Querypoint.LineModelTraceVisitor.prototype = Object.create(Querypoint.TraceVisitor.prototype);
  Querypoint.LineModelTraceVisitor.prototype.visitFunctionTraced = function(functionTree, activations) {
    // latest only
    this.visitActivationTraced(functionTree, activations[activations.length - 1]);
  }
  Querypoint.LineModelTraceVisitor.prototype.visitActivationTraced = function(functionTree, activation) {
    var functionDefinitionOffset = functionTree.location.start.offset;
    var line = this._sourceFile.lineNumberTable.getLine(functionDefinitionOffset);
    this.tracedOffsetsByLine[line] = this.tracedOffsetsByLine[line] || {};
    
    this.tracedOffsetsByLine[line].functionOffsets = this.tracedOffsetsByLine[line].functionOffsets || [];
    this.tracedOffsetsByLine[line].functionOffsets.push(functionDefinitionOffset);
    Querypoint.TraceVisitor.prototype.visitActivationTraced.call(this, functionTree, activation);
  }
  Querypoint.LineModelTraceVisitor.prototype.visitExpressionsTraced = function(expressionTree, turn, index, trace) {
    var offset = expressionTree.location.end.offset - 1;  // last char of the expression
    offset -= trace.length;  // backup to align with the end of the expression
    var line = this._sourceFile.lineNumberTable.getLine(offset);
    this.tracedOffsetsByLine[line] = this.tracedOffsetsByLine[line] || {};
    this.tracedOffsetsByLine[line].expressionOffsets = this.tracedOffsetsByLine[line].expressionOffsets || [];
    this.tracedOffsetsByLine[line].expressionOffsets.push(offset);
    this.latestTraceByOffset[offset] = trace;
  }
  
  Querypoint.FileViewModel = function(editor, sourceFile, tree) {
    this._editor = editor;
    this._sourceFile = sourceFile;
    this._tree = tree;
    
    this.fileName = editor.name;
    
    this._tokenViewModel = new Querypoint.TraceViewModel(this._tree, this._editor);
    
    editor.addListener('onViewportChange', this.updateViewport.bind(this));
    
    editor.addListener('onClickLineNumber', this.showTraceDataForLine.bind(this));
    editor.addListener('onTokenOver', this.showToken.bind(this));
    
    $(".QPOutput").live("click", function() {
      console.log("Click ", ko.dataFor(this));
    });

    
    this.updateViewport(editor.getViewport());
  }
  
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
          //this._editor.setLineClass(line+index+1, 'traceBackground', 'traceBackground');
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
    showToken: function(tokenEvent) {
      
      var line = tokenEvent.start.line;
      var offsetOfLine = this._sourceFile.lineNumberTable.offsetOfLine(line);
      var tokenOffset = offsetOfLine + tokenEvent.start.column;
      var tokenTree = Querypoint.FindInTree.byOffset(this._tree, tokenOffset);
      if (tokenTree) {
        var traces = tokenTree.location.trace;
        var tokenLog = tokenEvent.token + '@' + tokenOffset + '-' + (offsetOfLine + tokenEvent.end.column);
        console.log("showToken " + tokenLog + ' ' + tokenTree.type + (traces ? " Trace " + traces : ""));
        if (traces) {
          this._tokenViewModel.setModel(tokenTree);
          
          this._editor.drawTokenBox({token: tokenEvent.token, start: tokenTree.location.start, end: tokenTree.location.end});
        } // else not traced
      } else {
        console.warn("No tree at offset " + tokenOffset + ' for token ' + tokenLog);
      }
    },
  };

}());
