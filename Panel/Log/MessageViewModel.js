// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  'use strict';

  QuerypointPanel.MessageViewModel = {

    _reloadCount: 0,
    _turn: 0,

    initialize: function(log, loadListViewModel, turnScrubber) {
      this.log = log;
      
      this.messagesByLoadNumber = ko.computed(function() {
        var last = loadListViewModel.lastLoad();
        var first = last - turnScrubber.rangeShowable();
        if (first < 0)
          first = 0;
        return this.log.extractMessages(first, last);
      }.bind(this)).extend({throttle: 10}); // enough time to shift the array
      
      var messageView = document.querySelector('.messageView');
      ko.applyBindings(this, messageView);

      return this;
    },

    setMessageLogElement: function(node, message) {
      message.logView = node[1];
      // close over the most recent message element
      this._scrollIntoView = function scrollIntoView() {
        message.logView.scrollIntoView(false);  
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