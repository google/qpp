// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  var buffersStatusBarSelector = ".buffersStatusBar";
  
  QuerypointPanel.BuffersStatusBar = {
    initialize: function(panel) {
      this.exploringMode = ko.observable(false);
      this.openURLs = ko.observableArray();
      this.unsavedEditors = ko.observableArray();
      // at start up we assume the web page has reloaded since our last edit....
      this.savedEditors = ko.observableArray();
      
      this.currentTurnNumber = ko.computed(function() {
        return panel.logScrubber.turnStarted();
      });

      ko.applyBindings(this, document.querySelector(buffersStatusBarSelector));
      return this;
    }
  };
}());