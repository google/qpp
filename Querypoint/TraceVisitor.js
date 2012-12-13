 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com


(function() {
  window.Querypoint = window.Querypoint || {};
  
  // Walks the traceData structure
  
  Querypoint.TraceVisitor = function(project) {
    console.assert(project);
    // The project gives us access to Querypoint and traceur functions on the devtools iframe window.
    this._project = project;
  }
  
  Querypoint.TraceVisitor.prototype = {
    visitTrace: function(tree, traceData) {
      this.query = traceData.query;
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
      delete this.query;
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
        trace.query = this.query;
        // TODO need to match offsetKey in find() 
        var expressionTree = this._findInTree(functionTree, id);
        this.visitExpressionsTraced(expressionTree, activation.turn, activationCount, trace);
      }.bind(this));
    },
    
    visitExpressionsTraced: function(expressionTree, turn, activationCount, trace) {
      console.log("Visiting " + traceur.outputgeneration.TreeWriter.write(tree) + ' with trace ' + trace);
    }
  };

  //---------------------------------------------------------------------
  // Attach traceData to the appropriate subtree
  
  Querypoint.TreeHangerTraceVisitor = function(project) {
    Querypoint.TraceVisitor.call(this, project);
  }
  
  Querypoint.TreeHangerTraceVisitor.prototype = Object.create(Querypoint.TraceVisitor.prototype);
  
  Querypoint.TreeHangerTraceVisitor.prototype.isDuplicate = function(trace, traces) {
    var exists = traces.some(function(existingTrace) {
        if (
          trace.file && (trace.file !== existingTrace.file) ||
          trace.functionOffset && (trace.functionOffset !== existingTrace.functionOffset)
        ) return false;
        
        var same = 
          trace.load === existingTrace.load && 
          trace.turn === existingTrace.turn &&
          trace.activation === existingTrace.activation &&
          trace.value === trace.value;
        return same;        
    });
    return exists;
  }
  
  Querypoint.TreeHangerTraceVisitor.prototype.appendUnique = function(trace, traces) {
    var exists = this.isDuplicate(trace, traces);
      
    if (!exists) {
      traces.push(trace);
      this.isModified = true;
    }
  }
      
  Querypoint.TreeHangerTraceVisitor.prototype.visitExpressionsTraced = function(expressionTree, turn, activationCount, trace) {
    if (expressionTree.location) {

      var trace = {
        query: this.query,
        load: this._project.numberOfReloads,
        turn: turn,
        activation: activationCount,
        value: trace
      };

      var traces = expressionTree.location.traces = expressionTree.location.traces || [];
      this.appendUnique(trace,traces);
    }
  }
  
  //---------------------------------------------------------------------------
  // Create line-table info for UI showing where trace data may be hiding
  
  Querypoint.LineModelTraceVisitor = function(project, sourceFile) {
    Querypoint.TraceVisitor.call(this, project);
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

}());
