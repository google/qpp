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

  QuerypointPanel.LoadModel = function(loadNumber) { 
    this.loadNumber = loadNumber || '-';
    this.messages = [];
    this.turns = ko.observableArray();
  }

  QuerypointPanel.LoadModel.prototype = {
    causalChain: function(turn) {
      var causedBy = this.turns()[turn.registrationTurnNumber];
      if (causedBy) {
        var chain = this.causalChain(causedBy);
        chain.push(causedBy);
        return chain;
      } else {
        return [];
      }
    }
  };

  QuerypointPanel.LoadListViewModel = {
    
    initialize: function(sessionViewModel) {
      this.loadViewModels = ko.observableArray();

      var loadListView = document.querySelector('.loadListView');
      
      this.lastLoad = ko.computed(function() {
        if (debug) console.log('LoadListViewModel.lastLoad ' + this.loadViewModels().length + " loads");
        return this.loadViewModels().length;
      }.bind(this));

      
      var self = this;
      this.loadStartedNumber = ko.observable(0);
      this.loadEndedNumber = ko.observable(0);
      this.showLoad = ko.observable(new QuerypointPanel.LoadModel());
      this.showMessage = ko.observable(0);

      var sessionView = document.querySelector('.sessionView');  // Remove afer FIXME
      
      this.displayLoad = function(loadModel){
        var loadElement = document.querySelector('div.loadNumber[load="' + self.showLoad().loadNumber + '"]');
        if (loadElement) loadElement.classList.remove('selectedLoad');
        self.showLoad(loadModel);

        loadElement = document.querySelector('div.loadNumber[load="' + self.showLoad().loadNumber + '"]');
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
          var loadNumber = self.showLoad().loadNumber;
          if (loadNumber === '-' || loadNumber == self.loadStartedNumber()) {
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
              return self.showLoad().loadNumber + 1;
          }
      }.bind(this));

      this.currentLoadIsSelected = ko.computed( function(){
        return self.showLoad().loadNumber == self.loadStartedNumber();
      });

      this.isPastLoad = ko.computed( function(){
        return self.loadStartedNumber() && (self.showLoad().loadNumber != self.loadStartedNumber());
      });

      var currentLoadView = document.querySelector('.currentLoadView');
      currentLoadView.onmouseover = function(){
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

    pageWasReloaded: function(runtimeInstalled, runtimeInstalling) {
      if (!runtimeInstalled) {
        this.loadStartedNumber(0);    
        this.loadEndedNumber(0);
      }
    },

    onBeginLoad: function(loadViewModel) {
      this.showLoad().next = loadViewModel;
      this.showLoad(loadViewModel);
      this.loadViewModels.push(loadViewModel);
    }
  };
}());
