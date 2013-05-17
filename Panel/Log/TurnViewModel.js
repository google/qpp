// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('TurnViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.TurnViewModel = {
    initialize: function(loadListViewModel, project, tracequeries) {
      var turnViewModel = this;

      this.showTurn = ko.observable(0);
      
      this.turnSummary = ko.computed(function(){
        var info = 'Turn ' + turnViewModel.showTurn() + ' on load ' + loadListViewModel.showLoad().load + '.';
        return info;
      });

      this.turn = ko.computed(function(){
        try {
            var currentTurnNumber = turnViewModel.showTurn(); // updated by user interaction
            if (currentTurnNumber) {  
              var load = loadListViewModel.showLoad();
              if (load.turns) {
                var turn = load.turns()[currentTurnNumber - 1];
                if (turn) {
                  if (!turn.url) {
                    turn.url = turnViewModel.createFileURL(turn);
                  }
                  return turn;
                } else {
                  console.warn('loadListViewModelViewModel.turn no entry in load.turns() for ' + (currentTurnNumber - 1), Object.keys(load.turns()));
                }
              } else {
                if (load.load !== '-') {
                  console.warn('loadListViewModelViewModel.turn no .turns in load', load);
                }
              }
            } 
        } catch(err) {
          console.warn('loadListViewModelViewModel.turn fails ' + err, err);
        }
      });

      this.hasTargetElement = ko.computed(function(){
          var summary = turnViewModel.turn();
          return summary && summary.target !== 'none';
      });

      this.turnMessages = ko.computed(function(){
        var turns = loadListViewModel.showLoad().turns;
        var messages = [];
        if (turns) {
          var turnIndex = turnViewModel.showTurn() - 1;
          var turn = turns()[turnIndex];
          if (turn)
            return turn.messages();
        }
        return messages;
      });

      this.turnChain = ko.computed(function(){
        var summary = turnViewModel.turn();
        if (!summary) return false; 
        var result = [];
        var target = summary.previousTurn;
        if (!target) return false;
        while (target) {
            result.push({turnNumber: target.turn});
            target = target.event.previousTurn;
        }
        return result;
      });

      this.triggeredEvents = ko.computed(function(){
        var summary = turnViewModel.turn();
        if (!summary || !summary.firedEvents || summary.firedEvents.length === 0) return false;
        return summary.firedEvents.map(function(turnNumber){
            return {turnNumber: turnNumber};
        });
      });

      this.addedEvents = ko.computed(function(){
        var summary = turnViewModel.turn();
        if (!summary || !summary.addedEvents || summary.addedEvents.length === 0) return false;
        return summary.addedEvents.map(function(detail){
            return {detail: detail};
        });
      });

      // 'this' is an element in the array returned by turnChain or triggeredEvents
      this.switchTurn = function(){
        QuerypointPanel.loadListViewModelViewModel.turnViewModel.showTurn(this.turnNumber);
        QuerypointPanel.loadListViewModelViewModel.showMessage(0);
      }

      this.elementQueryProvider = new QuerypointPanel.ElementQueryProvider(project);
      this._tracequeries = tracequeries; // TODO encapsulate in panel and pass query vai appendQuery

      var turnView = document.querySelector('.turnView');
      ko.applyBindings(this, turnView);
    },

    createFileURL: function(eventInfo) {
      // the QPRuntime only has the function start offset.
      var offset = parseInt(eventInfo.offset, 10);
      var functionTree = project.find(eventInfo.filename, offset);
      var startOffset = 0;
      var endOffset = 0;
      if (functionTree) {
        startOffset = functionTree.location.start.offset;
        endOffset = functionTree.location.end.offset;
      }
      return project.createFileURL(eventInfo.filename, startOffset, endOffset);
    },

    revealElement: function(){
        console.error("TODO reveal element");
    },

    traceElement: function(turnViewModel){
      console.log("trace target of turn " + this.showTurn(), turnViewModel);
      var summary = turnViewModel.turn(); 
      var selector = summary.target;
      var functionURL = summary.url;
      this.query = this.elementQueryProvider.getQueriesBySelector(selector, functionURL)[0];
      if (this.query && !this.query.isActive()) {
        this.query.activate(this._tracequeries().length);
        this._tracequeries.push(this.query);        
      }
      // User has asked for an action, now show them where the results will appear.
      turnViewModel.close();
    },

    highlightElement: function(){
        var DOM, highlightConfig, selector;
        selector = this.turn().target;
        if (!selector) {
          return;
        }
        DOM = chrome.devtools.protocol.DOM.prototype;
        highlightConfig = {
            contentColor: {r: 0, g: 0, b: 255, a: 0.4},
            borderColor: {r: 0, g: 0, b: 255, a: 0.4},
            marginColor: {r: 0, g: 0, b: 255, a: 0.4},
            paddingColor: {r: 0, g: 0, b: 255, a: 0.4},
        }
        DOM.getDocument(function(error, root){
            if (selector === '#document'){
                DOM.highlightNode(highlightConfig, root.nodeId, '');
            } else {
                DOM.querySelector(root.nodeId, selector, function(error, node){
                    DOM.highlightNode(highlightConfig, node, '', function(error){
                        if (debug && error) console.error('loadListViewModelViewModel.highlightElement FAILED:', error);
                        // else just ignore the error, occurs in testing
                    });
                });
            }
        });
    },

    unhighlight: function(){
        chrome.devtools.protocol.DOM.prototype.hideHighlight( );
    },

    close: function() {      
      var turnViewModelInfo = document.querySelector('.turnViewModel');
      turnViewModelInfo.style.display = 'none';
    }

  };

}());
