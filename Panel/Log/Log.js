// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  var messagePrototype = {
    tooltip: function() {
      return 'load: ' + this.load + ' turn: ' + this.turn + '| ' + this.text;
    }
  };
  
  QuerypointPanel.Log = {

    currentReload: {},
    currentTurn: {},

    initialize: function(project, logScrubber) {
      this.project = project;
      this._logScrubber = logScrubber;

      chrome.experimental.devtools.console.onMessageAdded.addListener(this._onMessageAdded.bind(this));

      chrome.experimental.devtools.console.getMessages(function(messages){
        messages.forEach(this._onMessageAdded.bind(this));
      }.bind(this));
      return this;

      return this;
    },
    
    _onMessageAdded: function(message) {
      this._reformatMessage(this._parse(message));
    },
    
    _parse: function(messageSource) {
      var mark = messageSource.text.indexOf('qp|');
      if (mark === 0) {
        messageSource.qp = true;
        var segments = messageSource.text.split(' ');
        var keyword = segments[1];
        switch(keyword) {
          case 'reload': 
            this._reloadCount = parseInt(segments[2], 10);
            break;
          case 'startTurn': 
            this._turn = parseInt(segments[2], 10);
            this._logScrubber.turnStarted(this._turn);
            break;
          case 'endTurn':
            this._logScrubber.turnEnded(parseInt(segments[2], 10));
            break;  
          default: 
            console.error("unknown keyword: "+messageSource.text);
            break;
        }
      }
      messageSource.load = this._reloadCount;
      messageSource.turn = this._turn;
      return messageSource; 
    },

    _reloadRow: function(messageSource) {
       return {load: messageSource.load, turns: [this._turnRow(messageSource)]}
    },
    
    _turnRow: function(messageSource) {
      return {turn: messageSource.turn, messages: [messageSource]};
    },

    _reformatMessage: function(messageSource) {
      if (messageSource.qp) return;
      if (typeof messageSource.load === 'undefined') messageSource.load = this.project.numberOfReloads + 1;
      if (typeof messageSource.turn === 'undefined') messageSource.turn = 0;
      messageSource.__proto__ = messagePrototype;
      
      if (this.currentReload.load !== messageSource.load) {
        this.currentReload = this._reloadRow(messageSource);
        this.currentTurn = this.currentReload.turns[0];
        this._logScrubber.loads.push(this.currentReload);
        console.log("_reformat "+this._logScrubber.loads().length);
      } else if (this.currentTurn.turn !== messageSource.turn) {
        this.currentTurn = this._turnRow(messageSource)
        this.currentReload.turns.push(this.currentTurn);
      } else {
        this.currentTurn.messages.push(messageSource);
      }
    },
    
    extractMessages: function(first, last) {
      var visibleMessages = [];
      //messageSource.odd = (--visibleLines) % 2;
      return this._logScrubber.loads();
    }

  };
}());