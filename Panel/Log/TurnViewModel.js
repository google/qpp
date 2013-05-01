// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('EventTurn', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.EventTurn = {
    initialize: function(logScrubber, project, tracequeries) {
      this._project = project;
      this.elementQueryProvider = new QuerypointPanel.ElementQueryProvider(project);
      this._tracequeries = tracequeries; // TODO encapsulate in panel and pass query vai appendQuery
      
      var eventTurn = this;

      this.showTurn = ko.observable(0);
      
      this.turnInformation = ko.computed(function(){
        return 'Turn ' + eventTurn.showTurn() + ' on load ' + logScrubber.showLoad().load + '.';
      });

      this.summary = ko.computed(function(){
        try {
            var currentTurnNumber = eventTurn.showTurn(); // updated by user interaction
            if (currentTurnNumber) {  
              var load = logScrubber.showLoad();
              if (load.turns) {
                var turn = load.turns()[currentTurnNumber - 1];
                if (turn) {
                  if (!turn.event.url) {
                    turn.event.url = eventTurn.createFileURL(turn.event);
                  }
                  return turn.event;
                } else {
                  console.warn('LogScrubber.summary no entry in load.turns() for ' + (currentTurnNumber - 1), Object.keys(load.turns()));
                }
              } else {
                if (load.load !== '-') {
                  console.warn('LogScrubber.summary no .turns in load', load);
                }
              }
            } 
        } catch(err) {
          console.warn('LogScrubber.summary fails ' + err, err);
        }
      });

      this.hasTargetElement = ko.computed(function(){
          var summary = eventTurn.summary();
          return summary && summary.target !== 'none';
      });

      this.turnMessages = ko.computed(function(){
        var turns = logScrubber.showLoad().turns;
        var messages = [];
        if (turns) {
          var turnIndex = eventTurn.showTurn() - 1;
          var turn = turns()[turnIndex];
          if (turn)
            return turn.messages();
        }
        return messages;
      });

      this.turnChain = ko.computed(function(){
        var summary = eventTurn.summary();
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
        var summary = eventTurn.summary();
        if (!summary || !summary.firedEvents || summary.firedEvents.length === 0) return false;
        return summary.firedEvents.map(function(turnNumber){
            return {turnNumber: turnNumber};
        });
      });

      this.registeredEntryPoints = ko.computed(function(){
        var summary = eventTurn.summary();
        if (summary && summary.registeredEntryPoints) {
            return summary.registeredEntryPoints.map(function(detail){
                return {detail: detail};
            });
        } else {
          return [];
        }
      });
      
    },    

    switchTurn: function(){
      // FIXME: move to LogScrubber and pass turnNumber arg
      QuerypointPanel.LogScrubber.eventTurn.showTurn(this.turnNumber);
      QuerypointPanel.LogScrubber.showMessage(0);
    },

    createFileURL: function(eventInfo) {
      // the QPRuntime only has the function start offset.
      var offset = parseInt(eventInfo.offset, 10);
      var functionTree = this._project.find(eventInfo.filename, offset);
      var startOffset = 0;
      var endOffset = 0;
      if (functionTree) {
        startOffset = functionTree.location.start.offset;
        endOffset = functionTree.location.end.offset;
      }
      return this._project.createFileURL(eventInfo.filename, startOffset, endOffset);
    },

    revealElement: function(){
      console.error("TODO reveal element");
    },

    traceElement: function(eventTurn){
      console.log("trace target of turn " + this.showTurn(), eventTurn);
      var summary = eventTurn.summary(); 
      var selector = summary.targetSelector;
      var functionURL = summary.url;
      this.query = this.elementQueryProvider.getQueriesBySelector(selector, functionURL)[0];
      if (this.query && !this.query.isActive()) {
        this.query.activate(this._tracequeries().length);
        this._tracequeries.push(this.query);        
      }
      // User has asked for an action, now show them where the results will appear.
      eventTurn.close();
    },

    highlightElement: function(){
        var DOM, highlightConfig, selector;
        selector = this.summary().target;
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
                        if (debug && error) console.error('LogScrubber.highlightElement FAILED:', error);
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
      var eventTurnInfo = document.querySelector('.eventTurn');
      eventTurnInfo.style.display = 'none';
    }

  };

}());
