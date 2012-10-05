// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  var buffersStatusBarSelector = ".buffersStatusBar";
  
  Querypoint.BuffersStatusBar = {
    initialize: function(initialBuffers) {
      var buffersStatusBar = this;
      buffersStatusBar.openURLs = ko.observableArray(initialBuffers.openURLs);
      buffersStatusBar.unsavedBuffers = ko.observableArray(initialBuffers.unsavedBuffers);
      // at start up we assume the web page has reloaded since our last edit....
      buffersStatusBar.savedBuffers = ko.observableArray();

      ko.applyBindings(buffersStatusBar, document.querySelector(buffersStatusBarSelector));
    }
  };
}());