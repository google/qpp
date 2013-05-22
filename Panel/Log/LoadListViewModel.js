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
    this.turnStarted = ko.observable(0);
    this.turnEnded = ko.observable(0);
    this.currentTurn = ko.computed(function() {
      return this.turns()[this.turnStarted() - 1];
    }.bind(this));
    this.turnStarted = ko.computed(function() {
      return this.turns().length;
    }.bind(this));
  }

  QuerypointPanel.LoadModel.prototype = {
    onTurnStarted: function(turnInfo) {
      this.turns.push(new QuerypointPanel.Turn(turnInfo));
      console.assert(this.turns().length = turnInfo.turnNumber);
    },
    onTurnEnded: function(turnNumber) {
      console.assert(this.turnStarted() === turnNumber);
      this.turnEnded(turnNumber);
    },
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
        var last = this.loadViewModels().length - 1;
        if (debug) console.log('LoadListViewModel.lastLoad ' +last + " loads");
        return this.loadViewModels()[last];
      }.bind(this));
      
      var self = this;
      this.showLoad = ko.observable({});
      this.showMessage = ko.observable(0);
      this.loadStartedNumber = ko.computed(function() {
        return this.loadViewModels().length;
      }.bind(this));
      this.loadEndedNumber = ko.observable(0);

      var sessionView = document.querySelector('.sessionView');  // Remove afer FIXME
      
      this.displayLoad = function(loadModel) {
        var loadElement = document.querySelector('div.loadNumber[load="' + this.showLoad().loadNumber + '"]');
        if (loadElement) loadElement.classList.remove('selectedLoad');
        this.showLoad(loadModel);

        loadElement = document.querySelector('div.loadNumber[load="' + this.showLoad().loadNumber + '"]');
        if (loadElement) loadElement.classList.add('selectedLoad');

        sessionViewModel.turnScrubberViewModel.updateOnLoadSelection(this.currentLoadIsSelected(), loadModel);
        
        if (loadModel.messages.length) {
          var lastLogElement = loadModel.messages[loadModel.messages.length - 1].logView;
          if (lastLogElement)
            lastLogElement.scrollIntoView(false);
        }
      }

      var nextLoadView = document.querySelector('.nextLoadView');

      this.shownextLoadView = ko.computed( function(){
          var loadNumber = self.showLoad().loadNumber;
          if (loadNumber === '-' || loadNumber == self.loadStartedNumber()) {
              nextLoadView.onmousedown = null;
              return '-';
          } else {
              nextLoadView.onmousedown = function() {
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
      var dropDown = document.querySelector('.turnView');
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
    },

    onBeginLoad: function(loadNumber) {
      var loadViewModel = new QuerypointPanel.LoadModel(loadNumber);
      this.showLoad().next = loadViewModel;
      this.showLoad(loadViewModel);
      this.loadViewModels.push(loadViewModel);
      console.assert(this.loadViewModels().length === loadNumber);
    },
    
    onEndLoad: function(loadNumber) {
      console.assert(loadNumber === this.loadStartedNumber());
      this.loadEndedNumber(loadNumber);
    }
  };
}());
