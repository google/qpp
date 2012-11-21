// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  window.QuerypointPanel = window.QuerypointPanel || {};

  QuerypointPanel.Log = {
    
    _messages: [],

    initialize: function(logScrubber) {
      this.logScrubber = logScrubber;
      
      this.visibleMessages = ko.computed(function() {
        if (! this._messages.length) {
          return [];
        }

        var last = logScrubber.lastShown();
        var first = last - logScrubber.rangeShowable();
        if (first < 0)
          first = 0;

        return this._messages.slice(first, last);
      }.bind(this)).extend({throttle: 10}); // enough time to shift the array

      chrome.experimental.devtools.console.onMessageAdded.addListener(this._onMessageAdded.bind(this));
      return this;
    },

    _onMessageAdded: function(message) {
      _messages.push(message);
      if (logScrubber.trackLatestMessage()) {
        logScrubber.lastShown(_message.length);
      }
    }

  };
}());