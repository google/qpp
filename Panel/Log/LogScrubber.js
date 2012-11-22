// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  QuerypointPanel.LogScrubber = {

    initialize: function(logElement) {
      this.lastShown = ko.observable(0);
     
      this.trackLatestMessage = ko.observable(true);

      // TODO depends on resize of logElement
      this.rangeShowable = ko.computed(function(){
        var height = logElement.clientHeight;
        var lineHeight = 13;
        var lines = Math.ceil(height / lineHeight);
        return lines;
      }.bind(this));
      return this;
    },

  };
}());