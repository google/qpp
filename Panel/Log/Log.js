// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  'use strict';   

  var DEBUG = false;

  var totalLogs = 0;
  
  var messagePrototype = {
    tooltip: function() {
     var logFloat = document.querySelector('.logContainer');
     var logScrubber = document.querySelector('.logScrubber');
     this.scroll = logFloat.scrollHeight;
     totalLogs++;
     if (DEBUG)
      console.log('Message.tooltip: total logs : '+totalLogs);

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
    
    _currentTurn: 'none yet',
    
    _onLoadEvent: function(segments) {
     this._logScrubber.loadEnded(parseInt(segments[2], 10));
    },    

    _onReload: function(segments) {
      this._reloadCount = parseInt(segments[2], 10);
      this._logScrubber.loadStarted(this._reloadCount);
      this._logScrubber._scale = 1;
    },    
    
    _onStartTurn: function(segments, messageSource) {
      messageSource.qp = false;                       // Start turn message need will be displayed in console with severity 'turn'
      messageSource.severity = 'turn';
      this._currentTurn = new QuerypointPanel.Turn(JSON.parse(unescape(segments[2])));
      this._currentTurnNumber = this._currentTurn.turnNumber;
      this._logScrubber.turnStarted(this._currentTurnNumber);

      var registrationTurn;
      if (this._currentTurn.registrationTurnNumber)
        registrationTurn = this.currentReload.turns()[this._currentTurn.registrationTurnNumber];
      else if (this._currentTurn.turnNumber !== 1)
        console.error("No registrationTurnNumber for turn " + this._currentTurn.turnNumber, this._currentTurn);

      messageSource.text = 'Turn ' + this._currentTurnNumber + ' started. (' + this._currentTurn.detail() + ')';
    },

    _onEndTurn: function(segments) {
      this._logScrubber.turnEnded(parseInt(segments[2], 10));
      this._logScrubber.updateSize();
    },

    _onSetTimeout: function(segments) {
      this._currentTurn.onSetTimeout( segments[2], segments[3] );
    },

    _onAddEventListener: function(segments) {
      this._currentTurn.onAddEventListener( segments[2], segments[3] );      
    },

    _parse: function(messageSource) {
      var mark = messageSource.text.indexOf('qp|');
      if (mark === 0) {
        messageSource.qp = true;
        var segments = messageSource.text.split(' ');
        var keyword = segments[1];
        switch(keyword) {
          case 'loadEvent': this._onLoadEvent(segments); break;
          case 'reload': this._onReload(segments); break;
          case 'startTurn': this._onStartTurn(segments, messageSource); break;
          case 'endTurn': this._onEndTurn(segments); break;
          case 'script': this.project.addScript(segments[2]); break; 
          case 'debug': break;
          case 'setTimeout': this._onSetTimeout(segments); break;
          case 'addEventListener': this._onAddEventListener(segments); break;
          default: console.error('Log._parse: unknown keyword: '+messageSource.text); break;
        }
      } else {  // not a qp message
          var started = this._logScrubber.turnStarted();
          if ( started && started === this._logScrubber.turnEnded()) 
              console.error('QPRuntime error: No turn for message after turn %o', this._currentTurnNumber);
      }
      messageSource.load = this._reloadCount;
      messageSource.turn = this._currentTurnNumber;
      messageSource.event = this._currentTurn;
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
        this._logScrubber._clearMessages();
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
        if(this.currentReload.load !== this._logScrubber.showLoad().load) this._logScrubber.displayLoad(this.currentReload);
        if (DEBUG){
          console.log('QuerypointPanel.Log._reformat turns.length ' + this.currentReload.turns.length);
        }
      } 
      messageSource.position = this.currentTurn.messages().length;
      this.currentTurn.messages.push(messageSource);
      this.currentReload.messages.push(messageSource);
      this._logScrubber._addMessage(messageSource);
      if (DEBUG){
        console.log('QuerypointPanel.Log._reformat messages.length ' + this.currentTurn.messages().length);
      }
    },
    
    extractMessages: function(first, last) {
      var visibleMessages = [];
      //messageSource.odd = (--visibleLines) % 2;
      return this._logScrubber.loads();
    },
    
    pageWasReloaded: function(runtimeInstalled) {
      this.initialize(this.project, this._logScrubber);
    }
  };

}());
