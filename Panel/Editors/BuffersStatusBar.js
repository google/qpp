// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  "use strict";

  var buffersStatusBarSelector = ".buffersStatusBar";
  
  QuerypointPanel.BuffersStatusBar = {
    initialize: function(panel) {
      this.exploringMode = ko.observable(false);
      this.openURLs = ko.observableArray();
      this.unsavedEditors = ko.observableArray();
      // at start up we assume the web page has reloaded since our last edit....
      this.savedEditors = ko.observableArray();
      
      this.currentLoadNumber = ko.computed(function() {
        var started = panel.logScrubber.loadStarted();
        var ended = panel.logScrubber.loadEnded();
        if (started === ended)
          return started;
        else
          return '_';
      });  // don't throttle load, needed for testing 

      this.currentTurnNumber = ko.computed(function() {
        return panel.logScrubber.turnStarted();
      }).extend({ throttle: 50 });

      this.numberOfTracequeries = ko.computed(function(){
        return panel.tracequeries().length;
      }).extend({ throttle: 50 });

      ko.applyBindings(this, document.querySelector(buffersStatusBarSelector));
      return this;
    }
  };
}());