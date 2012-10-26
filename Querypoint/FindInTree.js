// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){
  'use strict';

  var ParseTreeVisitor = traceur.syntax.ParseTreeVisitor;

  window.Querypoint = window.Querypoint || {};

  // @param distanceFunction the smallest return value will be the result
  Querypoint.FindInTree = function(distanceFunction) {
    this._distanceFunction = distanceFunction;
    this._closest = Number.MAX_VALUE;
  }
  
  Querypoint.FindInTree.findByDistanceFunction = function(tree, fncOfTree) {
    var visitor = new Querypoint.FindInTree(fncOfTree);
    visitor.visit(tree);
    return visitor.getMatchedTree();
  }
  
  Querypoint.FindInTree.byOffset = function(tree, offset) {
    function byOffset(offset, tree){
      if (tree.location) {
        var startOffset = tree.location.start.offset;
        var endOffset = tree.location.end.offset - 1;
        if (startOffset <= offset && offset <= endOffset) {
          return (endOffset - startOffset + 1);
        }
      }
    }
    return Querypoint.FindInTree.findByDistanceFunction(tree, byOffset.bind(this, offset)) 
  }

  Querypoint.FindInTree.prototype = traceur.createObject(
    ParseTreeVisitor.prototype, {
      getMatchedTree: function() {
        return this._deepestTree;
      },
      visitAny: function(tree) {
        var distance;
        if (tree && (distance = this._distanceFunction(tree))) {
          if (distance < this._closest) {
            this._deepestTree = tree;
            this._closest = distance;
          }
          ParseTreeVisitor.prototype.visitAny.call(this, tree);
          return true;
        } else {
          // Don't visit childern
          return false;
        }
      },
      visitList: function(list) {
        for (var i = 0; i < list.length; i++) {
          // List items don't over lap, so once we hit we are done.
          if ( this.visitAny(list[i]) ) return true;
        }
        return true;
      },
    });
}());