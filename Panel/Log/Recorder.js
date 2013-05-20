// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('Recorder', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.TurnReplayTrigger = function(turnsToReplay, allTurns, onReoccurance) {
    // The first turn we want to replay must be preceded by its causes.
    this.causalChains = [turnsToReplay[0]];
    
    // Don't track causes of turns caused by turns in the recording.
    var replayStart = turnsToReplay[0].turnNumber;
    var replayEnd = turnsToReplay[turnsToReplay.length - 1];
    var potentialChainHeads = turnsToReplay.slice(1);
    while(potentialChainHeads.length) {
      var chainHead = potentialChainHeads.shift();
      var chainHeadCauseNumber = chainHead.registrationTurnNumber;

      if (replayStart >= chainHeadCauseNumber && chainHeadCauseNumber <= replayEnd)
        continue;
      else
        this.causalChains.push(chainHead);
    }
    // get ready to track turns as they end 
    this.progressMarkers = this.causalChains.map(function(causalChain) {
      return 0;
    });
    // and callback when they all occur
    this._onReoccurance = onReoccurance;
  }

  QuerypointPanel.TurnReplayTrigger.prototype = {
    fire: function() {
      console.error("allCausesReoccurred!");
      this._onReoccurance();
    },

    onTurnEnded: function(turn) {
      var allCausesReoccurred = true;
      // move the markers forward if this turn looks like a cause in a chain
      this.progressMarkers = this.causalChain.map(function(chain, index) {
        if (chain[this.progressMarkers[index]].equivalentTo(turn))
          this.progressMarkers[index]++;
        if (this.progressMarkers[index] !== chain.length)
          allCausesReoccurred = false;
      }.bind(this));
      if (allCausesReoccurred)
        this.fire();
    }
  };


  QuerypointPanel.Recorder = {
    start: -1,    // First event recorded
    end:   0,     // First event not recorded

    initialize: function(loadListViewModel, turnScrubberViewModel) {
      this._loadListViewModel = loadListViewModel;
      this._turnScrubberViewModel = turnScrubberViewModel;
      this.recordingState = ko.observable('off'); // 'off' || 'play' || 'record' || 'recorded'
      this._showDot();
      return this;
    },

    onBeginRecorded: function(event) {
      var state = this.recordingState();
      switch(state) {
        case 'record': this._stopRecording(); break;
        case 'off': this._startRecording(); break;
        case 'recorded': this.play(); break;
        case 'play': this._stopPlayback(); break;
        default: throw new Error('Unknown recording state');
      }
    },

    onEndRecorded: function(event) {
      var state = this.recordingState();
      switch(state) {
        case 'record': this._stopRecording(); break;
        case 'off': break;  // not visible in UI
        case 'recorded': this._eraseRecording(); break;
        case 'play':  this._stopPlayback(); break;
        default: throw new Error('Unknown recording state');
      }
    },

    // 'off' -> 'record'
    _startRecording: function(){
      console.assert(this.recordingState() === 'off');
      if (!this._loadListViewModel.loadStarted()) return;
      if (!this._loadListViewModel.currentLoadIsSelected()) return;
     
      this._turnScrubberViewModel.onStartRecording();

      this.loadNumber = this._loadListViewModel.showLoad();
      this.start = this._loadListViewModel.showLoad().turns().length;
      this.end = -1;
      this._showDot();
      this.recordingState('record');
    },

    // 'record' -> 'recorded'
    _stopRecording: function() {
      console.assert(this.recordingState() === 'record');
      this.recordingState('recorded');
      this._showPlay();
      var allTurns = this._loadListViewModel.showLoad().turns(); 
      this.end = allTurns.length;
      var recordedTurns = allTurns.slice(this.start, this.end);
      this._replayTrigger = new QuerypointPanel.TurnReplayTrigger(allTurns, recordedTurns, this.autoReplay.bind(this));
      this._turnScrubberViewModel.onStopRecording();
    },
    
    // 'recorded' -> 'play' -> 'recorded'
    play: function(){
      console.assert(this.recordingState() === 'recorded');
      this.recordingState('play');
      for (var i = this.start; i < this.end; i++){
        // Injects a command that builds and event and dispatches to taget.
        var event = this._loadListViewModel.showLoad().turns()[i].event;
        var command = 'var target = document.querySelector("' + event.targetSelector + '"); ';
        command += 'var event = document.createEvent("Events"); ';
        command += 'event.initEvent("' + event.eventType + '", ' + event.eventBubbles + ', ' + event.eventCancels + '); ';
        command += 'target.dispatchEvent(event); ';
        chrome.devtools.inspectedWindow.eval(command);
      }
      chrome.devtools.inspectedWindow.eval('console.log("qp| replayComplete");');
      this.recordingState('recorded');
    },

    // 'recorded' -> 'off'
    _eraseRecording: function() {
      console.assert(this.recordingState() === 'recorded');
      this.recordingState('off');
      this.start = -1;
      this.end = 0;
      this._showDot();
      this._turnScrubberViewModel.onEraseRecording();
    },

    stopIfRecording: function() {
      this.onBeginRecorded();
    },
    
    _showDot: function() {
      var endRecorded = document.querySelector('.endRecorded');
      endRecorded.innerHTML = '&#9679;';  // dot
      var beginRecorded = document.querySelector('.beginRecorded');
      beginRecorded.innerHTML = '&#9679;';  // dot
    },

    _showPlay: function() {
      if (this.start !== -1) {
        var beginRecorded = document.querySelector('.beginRecorded');
        beginRecorded.innerHTML = '&#x25B6';   // Arrowish
        var endRecorded = document.querySelector('.endRecorded');
        endRecorded.innerHTML = 'x'; 
      }
    },

    autoReplay: function() {
      this._turnScrubberViewModel.recordedMessages([]);
      this._turnScrubberViewModel.messages = this._turnScrubberViewModel.recordedMessages;

      this.play();
    },
    
    onLoadEvent: function() {
  
    }

  };

}());