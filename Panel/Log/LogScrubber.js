// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  QuerypointPanel.LogScrubber = {


    
    initialize: function(logElement) {
      this.loads = ko.observableArray();

      this.trackLatestMessage = ko.observable(true);
      
      this.lastShown = ko.computed(function() {
        console.log(this.loads().length + " loads");
        return this.loads().length;
      }.bind(this));
      
      this.lastLoad = 0;
      this.lastTurn = 0;

      // TODO depends on resize of logElement
      this.rangeShowable = ko.computed(function(){
        var height = logElement.clientHeight;
        var lineHeight = 13;
        var lines = Math.ceil(height / lineHeight) + 1;
        return lines;
      }.bind(this));

      return this;
    },
    

  };
}());