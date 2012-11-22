// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.Log = {
    
    _messages: [],
    _reloadCount: 0,
    _turn: 0,

    initialize: function(logScrubber) {
      this.logScrubber = logScrubber;
     
      this.messagesByLoadNumber = ko.computed(function() {
        var last = logScrubber.lastShown();
        var first = last - logScrubber.rangeShowable();
        if (first < 0)
          first = 0;
        return this._reformat(this._messages, first, last);
      }.bind(this)).extend({throttle: 10}); // enough time to shift the array

      chrome.experimental.devtools.console.onMessageAdded.addListener(this._onMessageAdded.bind(this));

      chrome.experimental.devtools.console.getMessages(function(messages){
        messages.forEach(this._onMessageAdded.bind(this));
      }.bind(this));
      return this;
    },

    _onMessageAdded: function(message) {
      this._parse(message);
      this._messages.push(message);
      if (message.qp && this.logScrubber.trackLatestMessage()) {
        var last = this.logScrubber.lastShown() + 1;
        this.logScrubber.lastShown(last);
      }
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
            break;
          case 'endTurn':
            break;  
          default: 
            console.error("unknown keyword: "+messageSource.text);
            break;
        }
      }
      messageSource.load = this._reloadCount;
      messageSource.turn = this._turn; 
    },

    _reloadRow: function(messageSource) {
       return {load: messageSource.load, turns: [this._turnRow(messageSource)]}
    },
    
    _turnRow: function(messageSource) {
      return {turn: messageSource.turn, messages: [messageSource]};
    },

    _reformat: function(messageSources, first, last) {
      if (!messageSources.length) return;

      var visibleMessages = [];
      var currentReload = {};
      var currentTurn = {};
      var visibleLines = last;

      var length = messageSources.length;
      for (var i = 0; i < length; i++) {
        var messageSource = messageSources[length - i - 1];
        if (messageSource.qp) continue;
        messageSource.odd = (--visibleLines) % 2;
        if (currentReload.load !== messageSource.load) {
          currentReload = this._reloadRow(messageSource);
          currentTurn = currentReload.turns[0];
          visibleMessages.push(currentReload);
        } else if (currentTurn.turn !== messageSource.turn) {
          currentTurn = this._turnRow(messageSource)
          currentReload.turns.push(currentTurn);
        } else {
          currentTurn.messages.push(messageSource);
        }
        if (visibleLines < first) break;
      }
      return visibleMessages;
    }

  };
}());