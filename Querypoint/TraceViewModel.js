// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Update the trace view output on the LHS of the editor when
// either the editor viewport or trace data changes

(function(){
  window.Querypoint = window.Querypoint || {};

  Querypoint.TraceViewModel = function(editor) {
    editor.addListener('onViewportChange', function(event) {
      console.log('onViewportChange', event)
    });
    
  }

  Querypoint.prototype = {
  	
  };

}());