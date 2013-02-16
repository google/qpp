// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  'use strict';

  QuerypointPanel.LogViewModel = {

    _reloadCount: 0,
    _turn: 0,

    initialize: function(log, logScrubber) {
      this.log = log;
      this.logScrubber = logScrubber;
     
      this.messagesByLoadNumber = ko.computed(function() {
        var last = logScrubber.lastShown();
        var first = last - logScrubber.rangeShowable();
        if (first < 0)
          first = 0;
        return this.log.extractMessages(first, last);
      }.bind(this)).extend({throttle: 10}); // enough time to shift the array
      
      return this;
    },
  };
  
}());