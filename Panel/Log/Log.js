// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  'use strict';   

  var DEBUG = false;

  var totalLogs = 0;
  
  var messagePrototype = {
    tooltip: function() {
     var logFloat = document.querySelector('.floaty');
     var logScrubber = document.querySelector('.logScrubber');
     this.scroll = logFloat.scrollHeight;
     totalLogs++;
     if (DEBUG)
      console.log('Message.tooltip: total logs : '+totalLogs);

     // To have the scrubberBox focus on the last event the margin property is 
     // set to the position of that event. This is done keeping track of how
     // many events there's been and knowing the width of each event.
     // TODO: Needs test with multiple loads 
     // var moveScroll = -totalLogs * 9 - this.load * 15 - this.turn * 4 + logFloat.offsetWidth;
     // if (moveScroll > 0) moveScroll = 0;
     // logScrubber.style.marginLeft = (moveScroll).toString() + 'px';
     return 'load: ' + this.load + ' turn: ' + this.turn + '| ' + this.text;
    }
  };
  
  QuerypointPanel.Console = {
    __proto__: chrome.devtools.protocol.Console.prototype,
    onMessageAdded: {
      addListener: function(fnc) {
        QuerypointPanel.Console.messageAdded = fnc;
        if (!QuerypointPanel.Console._registered) {
          QuerypointPanel.Console.addListeners();
          QuerypointPanel.Console._registered = true;
        }
      }
    }
  };

  QuerypointPanel.Log = {

    currentReload: {},
    currentTurn: {},

    initialize: function(project, logScrubber) {
      this.project = project;
      this._logScrubber = logScrubber;

      QuerypointPanel.Console.onMessageAdded.addListener(this._onMessageAdded.bind(this));
      this._reloadBase = this.project.numberOfReloads + 1;

      this.currentReload.messages = [];
      return this;
    },
    
    _onMessageAdded: function(message) {
      this._reformatMessage(this._parse(message));
    },
    
    _currentEvent: 'none yet',
    
    _parse: function(messageSource) {
      var mark = messageSource.text.indexOf('qp|');
      if (mark === 0) {
        messageSource.qp = true;
        var segments = messageSource.text.split(' ');
        var keyword = segments[1];
        switch(keyword) {
          case 'loadEvent':
            this._logScrubber.loadEnded(parseInt(segments[2], 10));
            break;
          case 'reload': 
            this._reloadCount = parseInt(segments[2], 10);
            this._logScrubber.loadStarted(this._reloadCount);
            break;
          case 'startTurn': 
            messageSource.qp = false;
            messageSource.severity = 'turn';
            this._turn = parseInt(segments[2], 10);
            this._logScrubber.turnStarted(this._turn);
            this._currentEvent = {
              functionName: segments[3],
              filename: segments[4],
              offset: segments[5],
              eventType: segments[6],
              target: segments[7]
            };
            var turnDetail;
            turnDetail = this._currentEvent.functionName + '|' + this._currentEvent.eventType;
            if (this._currentEvent.target !== 'undefined') 
                turnDetail += '|' + this._currentEvent.target;
                
            messageSource.text = 'Turn ' + this._turn + ' started. (' + turnDetail + ')';
            break;
          case 'endTurn':
            this._logScrubber.turnEnded(parseInt(segments[2], 10));
            QuerypointPanel.OnPanelOpen.panel.logScrubber.showLoad.valueHasMutated();
            break; 
          case 'script':
            this.project.addScript(segments[2]);
            break; 
          default: 
            console.error('unknown keyword: '+messageSource.text);
            break;
        }
      }
      messageSource.load = this._reloadCount;
      messageSource.turn = this._turn;
      if (messageSource.load && messageSource.turn == 1) messageSource.load += 1;
      messageSource.event = this._currentEvent;
      return messageSource; 
    },

    _reloadRow: function(messageSource) {
      return {
        load: messageSource.load, 
        turns: ko.observableArray([this._turnRow(messageSource)]), 
        messages: []
      };
    },
    
    _turnRow: function(messageSource) {
      return {
        turn: messageSource.turn, 
        messages: ko.observableArray(),
        event: messageSource.event
      };
    },

    _reformatMessage: function(messageSource) {
      if (messageSource.qp) return;
      if (typeof messageSource.load === 'undefined') messageSource.load = this._reloadBase;
      if (typeof messageSource.turn === 'undefined') messageSource.turn = 0;
      messageSource.__proto__ = messagePrototype;
      messageSource.severity = messageSource.severity || messageSource.level;
      
      if (this.currentReload.load !== messageSource.load) {
      QuerypointPanel.OnPanelOpen.panel._clearMessages();
        this.currentReload = this._reloadRow(messageSource);
        this.currentTurn = this.currentReload.turns()[0];
        this._logScrubber.showLoad().next = this.currentReload;
        this._logScrubber.showLoad(this.currentReload);
        this._logScrubber.loads.push(this.currentReload);
        if (DEBUG){
          console.log('QuerypointPanel.Log._reformat loads.length '+ this._logScrubber.loads().length);
        }
      }  
      if (this.currentTurn.turn !== messageSource.turn) {
        this.currentTurn = this._turnRow(messageSource)
        this.currentReload.turns.push(this.currentTurn);
        this._logScrubber.showLoad(this.currentReload);
        //this.currentReload.messages.push({severity: 'turn', turn: this.currentTurn.turn});
        if (DEBUG){
          console.log('QuerypointPanel.Log._reformat turns.length ' + this.currentReload.turns.length);
        }
      } 
      messageSource.position = this.currentTurn.messages().length;
      this.currentTurn.messages.push(messageSource);
      this.currentReload.messages.push(messageSource);
      QuerypointPanel.OnPanelOpen.panel._addMessage(messageSource);
      if (DEBUG){
        console.log('QuerypointPanel.Log._reformat messages.length ' + this.currentTurn.messages().length);
      }
    },
    
    extractMessages: function(first, last) {
      var visibleMessages = [];
      //messageSource.odd = (--visibleLines) % 2;
      return this._logScrubber.loads();
    }
  };

}());
