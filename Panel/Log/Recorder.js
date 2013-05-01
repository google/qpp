// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('Recorder', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.Recorder = {
    load: 0,
    start: -1,    // First event recorded
    end:   0,     // First event not recorded

    startRecord: function(logScrubber){
      if (logScrubber.showLoad().load != logScrubber.loadStarted()) return;
      var button = document.querySelector('.recordIndicator');
      var marker = document.querySelector('.recordMarker');
      if (button.classList.contains('on')) {
          this.stopRecording(logScrubber, button, marker);
      } else {
          try{
            var current = logScrubber.showLoad().messages.length;
          } catch (err) {
              return;             // Load hasn't started
          }
          for (var i = 0; i < logScrubber.recordedMessages().length; i++) 
            logScrubber.preMessages().push(logScrubber.recordedMessages()[i]);
          for (var i = 0; i < logScrubber.postMessages().length; i++) 
            logScrubber.preMessages().push(logScrubber.postMessages()[i]);

          logScrubber.preMessages.valueHasMutated();
          logScrubber.recordedMessages([]);
          logScrubber.postMessages([]);
          logScrubber.updateSize();
  
          logScrubber.messages = logScrubber.recordedMessages;
  
          this.load = logScrubber.showLoad();
          this.start = logScrubber.showLoad().turns().length;
          this.end = -1;
          
          marker.onmousedown = function(){ 
            this.stopRecording(logScrubber, button, marker);
          }.bind(this);

          marker.innerHTML = '&#9679;';
          marker.style.display = 'block';
          marker.classList.add('on');
          button.classList.add('on');
      }
    },

    play: function(){
      for (var i = this.start; i < this.end; i++){
        // Injects a command that builds and event and dispatches to target.
        var event = this.load.turns()[i].event;
        var command = 'var target = document.querySelector("' + event.targetSelector + '"); ';
        command += 'var event = document.createEvent("Events"); ';
        command += 'event.initEvent("' + event.eventType + '", ' + event.eventBubbles + ', ' + event.eventCancels + '); ';
        command += 'target.dispatchEvent(event); ';
        chrome.devtools.inspectedWindow.eval(command);
      }
    },

    stopRecording: function(logScrubber, button, marker) {
      if (arguments.length == 0){
        this.end = logScrubber.showLoad().turns().length;
      } else {
        marker.innerHTML = '&#x25B6';
        this.end = logScrubber.showLoad().turns().length;
        this.messages = logScrubber.postMessages;
        marker.classList.remove('on');
        button.classList.remove('on');
        marker.onmousedown = null;
      }
    },

    stopIfRecording: function(logScrubber) {
      var button = document.querySelector('.recordIndicator');
      var marker = document.querySelector('.recordMarker');
      if (button && button.classList.contains('on')) {
          this.stopRecording(logScrubber, button, marker);
      }
    },
      
    showPlay: function() {
      if (this.start !== -1) {
        marker = document.querySelector('.recordMarker');
        marker.style.display = 'block';
        marker.innerHTML = '&#x25B6';
      }
    },

    // If all scripts are loaded and all onload events where triggered, we play the recorded events if any
    onLoadCompleted: function() {
     if(this.load !== 0){
        var logScrubber = this;

        logScrubber.recordedMessages([]);
        logScrubber.messages = logScrubber.recordedMessages;

        this.play();

        // Play events are sent by eval to the inspected window.
        // We need to change where messages are stored after all play events occur.
        setTimeout(function(){
          logScrubber.messages = logScrubber.postMessages;
          logScrubber.displayLoad(logScrubber.showLoad());
        },100);
      }
    }

  };

}());