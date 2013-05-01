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

    setMessageLogElement: function(node, message) {
      message.logElement = node[1];
      // close over the most recent message element
      this._scrollIntoView = function scrollIntoView() {
        message.logElement.scrollIntoView(false);  
      }
      if (!this._delayScrollIntoView) {    // then we need to plan to scroll
        this._delayScrollIntoView = true;   // only one plan in flight at at time
        var doScrollCurrent = function doScrollCurrent() { 
          this._delayScrollIntoView = false;  // plan complete
          this._scrollIntoView();             
        }
        setTimeout(doScrollCurrent.bind(this), 100);
      }
    },

  };
  
}());