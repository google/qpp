// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

var Querypoint = window.Querypoint = window.Querypoint || {};

Querypoint.Query = function() {
}

Querypoint.Query.prototype = {

  // These are class-level function (no this), stored in the prototype table

  setQueryOnTree: function(tree, query) {
    tree.location.queries = tree.location.queries || [];
    tree.location.queries.push(query);
  },
  
  getQueryOnTree: function(tree, queryConstructor) {
    if (tree.location.queries) {
      var found;
      tree.location.queries.some(function(query) {
        found = (query instanceof queryConstructor) ? query : null;
        return !!found;
      });
      return found;
    }
  }
};

}());
