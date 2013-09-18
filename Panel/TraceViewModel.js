// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// One item of trace data

(function() {
  "use strict";
  
  QuerypointPanel.TraceViewModel = function(traceData, project) {
    this.project = project;
    this.traceData_ = {};
    Object.keys(traceData).forEach(function(prop) {
        this.traceData_[prop] = traceData[prop];
      }.bind(this));
  }
  
  var valueViewModel = new QuerypointPanel.ValueViewModel();

  QuerypointPanel.TraceViewModel.prototype = {
    query: function() {
      return this.traceData_.query;
    },
    
    tooltip: function() {
      return this.query().title() + ' found in ' + this.traceData_.file;
    },
    
    url: function() {
      if (this.traceData_.isPrompt)
        return '';
      return  this.project.createFileURL(this.traceData_.file, this.traceData_.startOffset, this.traceData_.endOffset);
    },
    
    iconText: function() {
      return this.query().iconText();
    },

    loadNumber: function() {
      return this.traceData_.loadNumber;
    },

    turnNumber: function() {
      return this.traceData_.turn;
    },

    activationNumber: function() {
      return this.traceData_.activation;
    },

    value: function() {
      return valueViewModel.inlineView(this.traceData_.value.stringRep, this.traceData_.value.valueType);
    },
  };

}());
