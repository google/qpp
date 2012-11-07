 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Binds the tracuer SourceFile, Tree, and Editor to interactively
// update the Tree with trace data as the user explores the source
// in the editor

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TraceVisitor = function(project) {
    console.assert(project);
    this._project = project;
  }
  
  QuerypointPanel.TraceVisitor.prototype = {
    visitTrace: function(tree, traceData) {
      delete this.isModified;
      var functionDefinitionOffsetKeys = Object.keys(traceData);
      functionDefinitionOffsetKeys.forEach(function(functionDefinitionOffsetKey) {
        var functionDefinitionTree;
        if (functionDefinitionOffsetKey === 'file') {
          functionDefinitionTree = tree;
        } else {
          var functionDefinitionOffset = parseInt(functionDefinitionOffsetKey, 10);
          functionDefinitionTree = this._project.treeFinder().byOffset(tree, functionDefinitionOffset);
        }
        if (functionDefinitionTree) {
          var activations = traceData[functionDefinitionOffsetKey];
          if (activations.length) {
            this.visitFunctionTraced(functionDefinitionTree, activations);
          }
        }
      // else no call comes to visit* functions.
      }.bind(this));
      return this.isModified;
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
      var offsetKey = id.split('_')[1]; // [0] is the revision number (TODO) [2] is the range
      var offset = parseInt(offsetKey, 10);
      function byOffsetKey(offset, tree){
        var loc = tree.location;
        if (loc) {
          var startOffset = loc.start.offset;
          var endOffset = loc.end.offset - 1;
          if (startOffset <= offset && offset <= endOffset) {
            if (loc.traceId === id) 
              return 0;
            else 
              return Math.max(Math.abs(endOffset - offset), Math.abs(startOffset - offset));
          } else {
            return -1;
          }
        }
      }
      return this._project.treeFinder().findByDistanceFunction(tree, byOffsetKey.bind(this, offset));
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
  QuerypointPanel.TreeHangerTraceVisitor = function(project) {
    QuerypointPanel.TraceVisitor.call(this, project);
  }
  
  QuerypointPanel.TreeHangerTraceVisitor.prototype = Object.create(QuerypointPanel.TraceVisitor.prototype);
  QuerypointPanel.TreeHangerTraceVisitor.prototype.visitExpressionsTraced = function(expressionTree, turn, activationCount, trace) {
    if (expressionTree.location) {
      var traces = expressionTree.location.trace = expressionTree.location.trace || [];
      var trace = {
        turn: turn,
        activation: activationCount,
        value: trace
      };
      if (traces.indexOf(trace) === -1) {
        expressionTree.location.trace.push(trace);
        this.isModified = true;
      } 
    } else {
      console.error("Trace with no location", expressionTree);
    }
  }
   //---------------------------------------------------------------------------
  // Create line-table info for UI showing where trace data may be hiding
  
  QuerypointPanel.LineModelTraceVisitor = function(project, sourceFile) {
    QuerypointPanel.TraceVisitor.call(this, project);
    this._sourceFile = sourceFile;
    this.tracedOffsetsByLine = {};
    this.latestTraceByOffset = {};
  }
  QuerypointPanel.LineModelTraceVisitor.prototype = Object.create(QuerypointPanel.TraceVisitor.prototype);
  QuerypointPanel.LineModelTraceVisitor.prototype.visitFunctionTraced = function(functionTree, activations) {
    // latest only
    this.visitActivationTraced(functionTree, activations[activations.length - 1]);
  }
  QuerypointPanel.LineModelTraceVisitor.prototype.visitActivationTraced = function(functionTree, activation) {
    var functionDefinitionOffset = functionTree.location.start.offset;
    var line = this._sourceFile.lineNumberTable.getLine(functionDefinitionOffset);
    this.tracedOffsetsByLine[line] = this.tracedOffsetsByLine[line] || {};
    
    this.tracedOffsetsByLine[line].functionOffsets = this.tracedOffsetsByLine[line].functionOffsets || [];
    this.tracedOffsetsByLine[line].functionOffsets.push(functionDefinitionOffset);
    QuerypointPanel.TraceVisitor.prototype.visitActivationTraced.call(this, functionTree, activation);
  }
  QuerypointPanel.LineModelTraceVisitor.prototype.visitExpressionsTraced = function(expressionTree, turn, index, trace) {
    var offset = expressionTree.location.end.offset - 1;  // last char of the expression
    offset -= trace.length;  // backup to align with the end of the expression
    var line = this._sourceFile.lineNumberTable.getLine(offset);
    this.tracedOffsetsByLine[line] = this.tracedOffsetsByLine[line] || {};
    this.tracedOffsetsByLine[line].expressionOffsets = this.tracedOffsetsByLine[line].expressionOffsets || [];
    this.tracedOffsetsByLine[line].expressionOffsets.push(offset);
    this.latestTraceByOffset[offset] = trace;
  }

}());
