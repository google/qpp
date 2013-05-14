// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// History of past turn-sets or "loads"
// Current load is in the statusbar.
// Currently - shown load is on the left in the turn scrubber
// Next -shown load in the right in the turn scrubber.
// History of loads drops down from the left load.

(function() {

  'use strict';

  var debug = DebugLogger.register('LoadListViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.LoadModel = function() {  // TODO replace ad-hoc objects with LoadModel
    this.load = '-';
    this.messages = [];
  }

  QuerypointPanel.LoadListViewModel = {
    
    initialize: function(sessionViewModel) {
      this.pageLoads = ko.observableArray();

      var loadListView = document.querySelector('.loadListView');
      var currentLoad = document.querySelector('.currentLoad');
      
      this.lastLoad = ko.computed(function() {
        if (debug) console.log('LoadListViewModel.lastLoad ' + this.pageLoads().length + " loads");
        return this.pageLoads().length;
      }.bind(this));

      
      var self = this;
      this.loadStarted = ko.observable(0);
      this.loadEnded = ko.observable(0);
      this.showLoad = ko.observable(new QuerypointPanel.LoadModel());
      this.showMessage = ko.observable(0);

      var sessionView = document.querySelector('.sessionView');  // Remove afer FIXME
      
      this.displayLoad = function(loadModel){
        var loadElement = document.querySelector('div.loadNumber[load="' + self.showLoad().load + '"]');
        if (loadElement) loadElement.classList.remove('selectedLoad');
        self.showLoad(loadModel);

        loadElement = document.querySelector('div.loadNumber[load="' + self.showLoad().load + '"]');
        if (loadElement) loadElement.classList.add('selectedLoad');

        sessionViewModel.turnScrubberViewModel.updateOnLoadSelection(self.currentLoadIsSelected(), loadModel);
        
        if (loadModel.messages.length) {
          var lastLogElement = loadModel.messages[loadModel.messages.length - 1].logView;
          if (lastLogElement)
            lastLogElement.scrollIntoView(false);
        }
      }

      var nextLoad = document.querySelector('.nextLoad');

      this.showNextLoad = ko.computed( function(){
          var load = self.showLoad().load;
          if (load === '-' || load == self.loadStarted()) {
              nextLoad.onmousedown = null;
              return '-';
          } else {
              nextLoad.onmousedown = function() {
                  var next = self.showLoad().next;
                  if (next) 
                    self.displayLoad(next);
                  else 
                    self.displayLoad(new QuerypointPanel.LoadModel());
              };
              return self.showLoad().load+1;
          }
      }.bind(this));

      this.currentLoadIsSelected = ko.computed( function(){
        return self.showLoad().load == self.loadStarted();
      });

      this.isPastLoad = ko.computed( function(){
        return self.loadStarted() && (self.showLoad().load != self.loadStarted());
      });

      currentLoad.onmouseover = function(){
          dropDown.style.display = 'none';
          loadListView.style.display = 'block';
      }
    
      var loadListView = document.querySelector('.loadListView');
      ko.applyBindings(this, loadListView);

      return this;
    },
  
    selectLoad: function(node){
        if (!node.classList) return;
        var element = document.querySelector('.selectedLoad');
        if(element) element.classList.remove('selectedLoad');
        node.classList.add('selectedLoad');
    },

    pageWasReloaded: function(runtimeInstalled) {
      if (!runtimeInstalled) {
        this.loadStarted(0);    
        this.loadEnded(0);
      }
    }
  };
}());
