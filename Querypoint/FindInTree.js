// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){
  'use strict';

  var debug = DebugLogger.register('FindInTree', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  var ParseTreeVisitor = traceur.syntax.ParseTreeVisitor;


  // The algorightm depends upon each branch of the tree enclosing unique nested character regions.
  // It won't work if a transformation mixes up the tree.location regions.

  // @param distanceFunction the smallest return value will be the result
  Querypoint.FindInTree = function(distanceFunction) {
    this._distanceFunction = distanceFunction;
    this._closest = Number.MAX_VALUE;
  }
  
  Querypoint.FindInTree.findByDistanceFunction = function(tree, fncOfTree) {
    var visitor = new Querypoint.FindInTree(fncOfTree);
    visitor.visit(tree);
    if (debug)
      console.log("FindInTree closest "+visitor._closest, traceur.outputgeneration.TreeWriter.write(visitor.getMatchedTree())); 
    return visitor.getMatchedTree();
  }
  
  Querypoint.FindInTree.byOffset = function(tree, offset) {
    function byOffset(offset, tree){
      if (tree.location) {
        var startOffset = tree.location.start.offset;
        var endOffset = tree.location.end.offset;
        if (startOffset <= offset && offset <= endOffset) {
          return Math.max(Math.abs(endOffset - offset), Math.abs(startOffset - offset));
        } else {
          return -1;
        }
      }
    }
    return Querypoint.FindInTree.findByDistanceFunction(tree, byOffset.bind(this, offset)) 
  }

  Querypoint.FindInTree.prototype = {

    __proto__: ParseTreeVisitor.prototype,

    getMatchedTree: function() {
      return this._deepestTree;
    },

    visitAny: function(tree) {
      var distance;
      if (tree && tree.location && !tree.doNotTransform && !tree.doNotTrace) {
        distance = this._distanceFunction(tree);
        if (distance < 0)
          return false;
        if (debug) {
          var range = tree.location ?  tree.location.start.offset + '-' + tree.location.end.offset : "no-location";
          console.log("FindInTree " + distance + '<' + this._closest + " type " + tree.type + ':' + range);
        }
        if (distance <= this._closest) {
          this._deepestTree = tree;
          this._closest = distance;
          if (distance) { // try to get closer
            ParseTreeVisitor.prototype.visitAny.call(this, tree);
          } // else hit
        }
      } else {
        // Don't visit childern
        return false;
      }
    },

    visitFunction: function(tree) {
      this.visitAny(tree.name);
      this.visitFormalParameterList(tree.formalParameterList);
      this.visitAny(tree.functionBody);
    },

    visitFormalParameterList: function(tree) {
      // Enlarge the hit zone to include the parens
      var startOffset = tree.location.start.offset;
      var endOffset = tree.location.end.offset;
      tree.location.start.offset -= 1;
      tree.location.end.offset += 1;
      this.visitAny(tree);
      tree.location.start.offset = startOffset;
      tree.location.end.offset = endOffset;
    },

    visitList: function(list) {
      for (var i = 0; i < list.length; i++) {
        // List items don't over lap, so once we hit we are done.
        if ( this.visitAny(list[i]) ) return true;
      }
      return true;
    },
  };
  
}());