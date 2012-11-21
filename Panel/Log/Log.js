// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.Log = {
    
    _messages: [],

    initialize: function(logScrubber) {
      this.logScrubber = logScrubber;
      
      this.visibleMessages = ko.computed(function() {
        var last = logScrubber.lastShown();
        var first = last - logScrubber.rangeShowable();
        if (first < 0)
          first = 0;

        return this._messages.length ? this._messages.slice(first, last) : [];
        
      }.bind(this)).extend({throttle: 10}); // enough time to shift the array

      chrome.experimental.devtools.console.onMessageAdded.addListener(this._onMessageAdded.bind(this));

      chrome.experimental.devtools.console.getMessages(function(messages){
        messages.forEach(this._onMessageAdded.bind(this));
      }.bind(this));
      return this;
    },

    _onMessageAdded: function(message) {
      this._messages.push(message);
      if (this.logScrubber.trackLatestMessage()) {
        this.logScrubber.lastShown(this._messages.length - 1);
      }
    }

  };
}());