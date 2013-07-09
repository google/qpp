// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// One item of trace data

(function() {
  "use strict";
  
  QuerypointPanel.TraceViewModel = function(traceData, project) {
    Object.keys(traceData).forEach(function(prop) {
        this[prop] = traceData[prop];
      });
  }
  
  QuerypointPanel.TraceViewModel.prototype = {
    tooltip: function() {
      return this.query.title() + ' found in ' + this.file;
    },
    
    url: function() {
      return  this.project.createFileURL(this.file, this.startOffset, this.endOffset);
    },
    
    iconText: function() {
      return this.query.iconText();
    }
  };

}());
