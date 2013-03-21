// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){
  
  'use strict';
  
 
  var debug = DebugLogger.register('AllInFileTransformer', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })
  
  var AllInFileTransformer = Querypoint.AllInFileTransformer = function(queryData) {
    this.filenames = queryData.filenames;
  }

  // The tracing is done in QPTreeWriter after all transformations.

  AllInFileTransformer.prototype = {

    transformTree: function(tree) {
      var filename = tree.location.start.source.name;
      if (this.filenames.indexOf(filename) !== -1) { // then we want to trace it.
        tree.location.traceAll = true;
      }
      return tree;
    },

  };

}());