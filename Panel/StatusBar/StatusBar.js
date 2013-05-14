// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  "use strict";

  var statusBarSelector = ".statusBar";
  
  QuerypointPanel.StatusBar = {
    initialize: function(panel, sessionViewModel) {
      this.exploringMode = ko.observable(false);
      this.openURLs = ko.observableArray();
      this.unsavedEditors = ko.observableArray();
      // at start up we assume the web page has reloaded since our last edit....
      this.savedEditors = ko.observableArray();
      
      this.currentLoadNumber = ko.computed(function() {
        var started = sessionViewModel.loadListViewModel.loadStarted();
        var ended = sessionViewModel.loadListViewModel.loadEnded();
        if (started === ended)
          return started;
        else
          return '_';
      });  // don't throttle load, needed for testing 

      this.currentTurnNumber = ko.computed(function() {
        return sessionViewModel.turnScrubberViewModel.turnStarted();
      }).extend({ throttle: 50 });

      this.numberOfTracequeries = ko.computed(function(){
        return panel.tracequeries().length;
      }).extend({ throttle: 50 });

      ko.applyBindings(this, document.querySelector(statusBarSelector));
      return this;
    }
  };
}());