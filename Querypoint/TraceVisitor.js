 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com


(function() {
  
  'use strict';

  var debug = DebugLogger.register('TraceVisitor', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });
  
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
      var segments = id.split('_'); // [0] is the revision number (TODO), [1] offset [2]  range
      var range = parseInt(segments[2], 10)
      var offset = parseInt(segments[1], 10);
      function byOffsetKey(offset, range, tree){
        var loc = tree.location;
        if (loc) {
          var startOffset = loc.start.offset;
          var endOffset = loc.end.offset - 1;
          var tokenRange = endOffset - startOffset + 1;
          if (startOffset <= offset && offset <= endOffset) {
            if (tokenRange === range) 
              return 0;
            else 
              return Math.max(Math.abs(endOffset - offset), Math.abs(startOffset - offset));
          } else {
            return -1;
          }
        }
      }
      return this._project.treeFinder().findByDistanceFunction(tree, byOffsetKey.bind(this, offset, range));
    },
    
    visitActivationTraced: function(functionTree, activation, activationCount) {
      var tracedExpressionIds = Object.keys(activation);
      tracedExpressionIds.forEach(function(id) {
        if (id === 'turn')
          return;

        var trace = activation[id];
        trace.query = this.query;

        var expressionTree = this._findInTree(functionTree, id);
        if (debug) {
          var treeAsString = traceur.outputgeneration.TreeWriter.write(expressionTree);
          var treeLoc = expressionTree.location.start.offset + '-' + expressionTree.location.end.offset;
          console.log("TreeHangerTraceVisitor.visitActivationTraced " + id + " @"+treeLoc + ": " + treeAsString);
        }
        
        this.visitExpressionsTraced(expressionTree, activation.turn, activationCount, trace);
      }.bind(this));
    },
    
    visitExpressionsTraced: function(expressionTree, turn, activationCount, trace) {
      console.error("No override while bisiting " + traceur.outputgeneration.TreeWriter.write(tree) + ' with trace ' + trace);
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
          trace.loadNumber === existingTrace.loadNumber && 
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
      var loc = expressionTree.location;
      var trace = {
        query: this.query,
        loadNumber: this._project.numberOfReloads,
        turn: turn,
        activation: activationCount,
        value: trace,
        file: loc.start.source.name,
        startOffset: loc.start.offset,
        endOffset: loc.end.offset,
        project: this._project
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
    this.tracesByLine = [];
  }
  
  Querypoint.LineModelTraceVisitor.prototype = {
    __proto__: Querypoint.TraceVisitor.prototype,
    
    visitFunctionTraced: function(functionTree, activations) {
      // latest only
      this.visitActivationTraced(functionTree, activations[activations.length - 1]);
    },
    
    visitActivationTraced: function(functionTree, activation) {
      var functionDefinitionOffset = functionTree.location.start.offset;
      if (functionDefinitionOffset < 0)
        throw new Error("LineModelTraceVisitor.visitActivationTraced invalid functionTree offset " + functionDefinitionOffset);
      var line = this._sourceFile.lineNumberTable.getLine(functionDefinitionOffset);
      this.tracesByLine[line] = this.tracesByLine[line] || [];
      this.tracesByLine[line].push({offset: functionDefinitionOffset, activation: activation});
      Querypoint.TraceVisitor.prototype.visitActivationTraced.call(this, functionTree, activation);
    },
    
    visitExpressionsTraced: function(expressionTree, turn, index, trace) {
      var offset = expressionTree.location.end.offset - 1;  // last char of the expression
      
      if (offset < 0)
        throw new Error("LineModelTraceVisitor.visitExpressionsTraced invalid offset " + offset);

      var line = this._sourceFile.lineNumberTable.getLine(offset);
      this.tracesByLine[line] = this.tracesByLine[line] || [];
      // TODO change locals/args to mathc names
      this.tracesByLine[line].push({endOffset: offset, turn: turn, index: index, value: trace});
    },
  }; 
  
}());
