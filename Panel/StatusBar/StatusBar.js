// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  "use strict";

  var debug = DebugLogger.register('StatusBar', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  var statusBarSelector = ".statusBar";
  
  QuerypointPanel.StatusBar = {
    initialize: function(panel, sessionViewModel) {
      this.runtimeNotInstalled = ko.computed(function() {
        if (debug) console.log('StatusBar runtimeInstalled: ' + sessionViewModel.runtimeInstalled());
        return !sessionViewModel.runtimeInstalled();
      });
      this.openURLs = ko.observableArray();
      this.unsavedEditors = ko.observableArray();
      // at start up we assume the web page has reloaded since our last edit....
      this.savedEditors = ko.observableArray();
      
      this.currentLoadNumber = ko.computed(function() {
        var started = sessionViewModel.loadListViewModel.loadStartedNumber();
        if (!started)
          return 0;
        var ended = sessionViewModel.loadListViewModel.loadEndedNumber();
        if (started === ended)
          return started;
        else
          return '_';
      });  // don't throttle load, needed for testing 

      this.currentTurnNumber = ko.computed(function() {
        var currentTurn = sessionViewModel.currentTurn();   
        return currentTurn ? currentTurn.turnNumber : 0;
      }).extend({ throttle: 50 });

      this.numberOfTracequeries = ko.computed(function(){
        return panel.tracequeries().length;
      }).extend({ throttle: 50 });

      ko.applyBindings(this, document.querySelector(statusBarSelector));
      return this;
    }
  };
}());