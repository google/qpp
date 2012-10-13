// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

(function() {
  Querypoint.QPOutput = function(elt, fileName) {
    this.elt = elt;
    this.fileName = fileName;
    this.initialize(elt, fileName);
  }

  Querypoint.QPOutput.prototype = {
    initialize: function(elt, fileName) {
      this.getTraceData(fileName, this.renderTraceData.bind(this, elt));
    },

    getTraceData: function(fileName, callback) {
      chrome.devtools.inspectedWindow.eval('Object.keys(window.__qp.activations)', callback);
    },

    renderTraceData: function(destinationElement, traceData) {
      console.log("renderTraceData traceData: ", traceData);
    }
  };
}());