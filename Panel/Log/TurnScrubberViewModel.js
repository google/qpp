// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('TurnScrubberViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  ko.bindingHandlers.stopBinding = {
      init: function() {
          return { controlsDescendantBindings: true };
      }
  };
  ko.virtualElements.allowedBindings.stopBinding = true;

  QuerypointPanel.TurnScrubberViewModel = {
    
    initialize: function(project, tracequeries, sessionViewModel) {
      this.sessionViewModel = sessionViewModel;
      this.loadListViewModel = sessionViewModel.loadListViewModel;
      this.recorder = QuerypointPanel.Recorder.initialize(sessionViewModel.loadListViewModel, this);
            
      var self = this;
      this.lastLoad = 0;

      this.turnViewModel = QuerypointPanel.TurnViewModel;
      this.turnViewModel.initialize(sessionViewModel.loadListViewModel, project, tracequeries);
      
      this._initMouse();

      var panel =  document.querySelector('.panel');
      var sessionView = document.querySelector('.sessionView');
      var loadElement = document.querySelector('.loadListView');
      var dropDown = document.querySelector('.turnView');
      
      this.preIndicators = ko.observableArray();          // Turns before the play button
      this.postIndicators = ko.observableArray();         // Turns after record button
      this.recordedIndicators = ko.observableArray();     // Turns that occured in recorded turns
      this.indicators = this.preIndicators;                 // Points to indicator array where new indicators go
      this._currentIndicator = {};                    

      // Method that changes css style to change width and border of indicators
      // The modified rule is in a stylesheet by itself turnIndicator.css
      this._setMessageWidth = function(width) {
        var turnIndicatorSheet;
        for (var i = 0; i < document.styleSheets.length; i++) {
          var styleSheet = document.styleSheets[i]
          if (styleSheet.href.indexOf('turnIndicator.css') !== -1) {
            turnIndicatorSheet = styleSheet;
            break;
          }
        }
        var turnIndicatorRule;
        for (var i = 0; i < turnIndicatorSheet.cssRules.length; i++) {
            var cssRule = turnIndicatorSheet.cssRules[i];
            if (cssRule.selectorText.indexOf('.turnIndicator') !== -1) {
                turnIndicatorRule = cssRule;
                break;
            }
        }
        if (width < 3) 
            turnIndicatorRule.style.borderLeftWidth = '0px';
        else 
            turnIndicatorRule.style.borderLeftWidth = '2px';
            
        if (width > 10)
            turnIndicatorRule.style.width = '10px';
        else 
            turnIndicatorRule.style.width = width + 'px';
      }

      this.updateOnLoadSelection = ko.computed(function(load) { // TODO MDV
        this.recorder.stopIfRecording();
        var load = this.loadListViewModel.showLoad();
        var currentLoadIsSelected = this.loadListViewModel.currentLoadIsSelected();
        if (currentLoadIsSelected) {
          self.updateSize();
        } else {
          var maxTurns = (load.indicators && load.indicators.length) || 100;
          var width = this.availableViewWidth || 800;
          self._setMessageWidth(this.availableViewWidth / maxTurns);
        }
      }.bind(this));

      this._severities = ['turn', 'log', 'warning', 'error'];

      this.updateTurnIndicator = function(turn, severity){
        if (this._currentIndicator.turn !== turn) {
          this._currentIndicator = {severity: severity, turn: turn};
          this.indicators().push(this._currentIndicator);
        } else {
          var index = this._severities.indexOf(severity);
          var currentIndex = this._severities.indexOf(this._currentIndicator.severity);
          if (index > currentIndex)
            this._currentIndicator.severity = this._severities[index];
        }
      }

      // Method calculates size of indicator, if the number of indicators exceed the width of the screen arrays get scaled
      // to half their size.
      this.updateSize = function(){
        self.indicators.valueHasMutated();
        this.availableViewWidth = sessionView.offsetWidth - 40;
        var joinMessages = self.preIndicators().length + self.recordedIndicators().length + self.postIndicators().length;

        if (joinMessages < this.availableViewWidth) {
          var width = Math.floor(this.availableViewWidth / joinMessages);
          self._setMessageWidth(width);
        } else {
          self._scale *= 2;
          self._currentIndicator = 0;
          if (self.indicators !== self.preIndicators) self._scaleMessages(self.preIndicators);
          if (self.indicators !== self.recordedIndicators) self._scaleMessages(self.recordedIndicators);
          self._scaleMessages(self.indicators);
          this.updateSize();
        }
      }

      // Method that takes an array of indicators and reduces size to half by merging pair of indicators together
      this._scaleMessages = function(indicators) {
        var len = indicators().length;
        if (len % 2 == 1){
            indicators.push(indicators()[len-1]);
            len++;
        }

        for (var i = 0; i < len / 2; i++){
            var indicator = {severity: null, position: null, scroll: null, turn: null};

            indicator.severity = 'log';   // Defines color of indicator in scrubber bar turn>error>warn>log 
            if (indicators()[i * 2].severity === 'warn' || indicators()[i * 2 + 1].severity === 'warn') indicator.severity = 'warn';
            if (indicators()[i * 2].severity === 'error' || indicators()[i * 2 + 1].severity === 'error') indicator.severity = 'error';
            if (indicators()[i * 2].severity === 'turn') indicator.severity = 'turn';

            indicator.position = indicators()[i * 2].position;      // Position is the relative order of the indicators among other indicators, used to focus indicator on mouseover.
            indicator.scroll = indicators()[i * 2].scroll;          // Scroll is the element that gets focused in console when indicator is clicked
            indicator.turn = indicators()[i * 2].turn;              // Turn number of the indicator
            if (indicators()[i * 2 + 1].severity === 'turn'){     // If a indicator is a Turn then we'll take it as more relevant than previos indicators
                indicator.severity = 'turn';
                indicator.position = 0;
                indicator.turn = indicators()[i * 2 + 1].turn;
            }
            indicators()[i] = indicator;
        }
        indicators.splice(indicators().length / 2);
        indicators.valueHasMutated();
      }

      this._clearIndicators = function(){  // TODO vs resetMessages
          this.preIndicators([]);
          this.postIndicators([]);
          this.recordedIndicators([]);
          this.indicators = self.preIndicators;
      }

      dropDown.onmouseout = function(event) {
          var e = event.toElement || event.relatedTarget;
          if (sessionViewModel.isOurRelatedTarget(e, this)) return false;
          dropDown.style.display = 'none';
      }
    
      var turnScrubberView = document.querySelector('.overviewLog');
      ko.applyBindings(this, turnScrubberView);

      return this;
    },
    
    _initMouse: function() {
      var scrubber = this;
      var scrubberIndicator = $('.scrubberIndicator');
      scrubberIndicator.on('mousedown', function(downEvent){
        var originalPosition = $('.scrubberIndicator').position();
        function mousemove(moveEvent) {
          var dx = downEvent.pageX - moveEvent.pageX;
          var dy = downEvent.pageY - moveEvent.pageY;
          if (Math.abs(dx) > Math.abs(dy)) {
            scrubberIndicator.css({left: (originalPosition.left - dx) + 'px'});;
          } else {
            console.error("TODO implement grab");
          }
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
        };
        
        $('.scrubberIndicator').on('mousemove', mousemove);

        $('.scrubberIndicator').on('mouseup mouseleave', function(upEvent){
          $('.scrubberIndicator').off('mousemove', mousemove);
          upEvent.preventDefault();
          upEvent.stopPropagation();
        });
      });
    },
    
    collapseTurns: function(node, event){
      if (arguments.length == 2){
          node = event.currentTarget;
      } else {
          node = arguments[0].parentElement;
      }

      var allTurns = document.querySelectorAll('span.turns');
      var currentLoad = node.querySelector('span.turns');
      
      while (!currentLoad){
          node = node.parentElement;
          currentLoad = node.querySelector('span.turns');
      }
      
      for(var i = 0 ; i < allTurns.length ; i++){
          allTurns[i].classList.add('hiddenTurn');
      }
      
      currentLoad.classList.remove('hiddenTurn');

      // There's an issue where elements in scrubberBox are displayed in wrong order
      // Redrawing scrubberbox fixes this. There should be a better solution.
      // TODO: Avoid redrawing scrubberbox
      document.querySelector('.turnScrubberView').style.display = 'none';
      setTimeout( function(){ document.querySelector('.turnScrubberView').style.display = 'block'; } , 1);
    },

    onLoad: function() {

    },

    onBeginLoad: function() {
      this._scale = 1;
      this._clearIndicators();
    },

    _resetIndicators: function() {
      for (var i = 0; i < this.recordedIndicators().length; i++) 
        this.preIndicators().push(this.recordedIndicators()[i]);
      for (var i = 0; i < this.postIndicators().length; i++) 
        this.preIndicators().push(this.postIndicators()[i]);

      this.preIndicators.valueHasMutated();
      this.recordedIndicators([]);
      this.postIndicators([]);
      this.updateSize();
    },

    onStartRecording: function() {
      this._resetIndicators();
      this.indicators = this.recordedIndicators;
    },
  
    onStopRecording: function() {
      this.indicators = this.postIndicators;
    },

   onReplayBegins: function() {
      this._resetIndicators();
      this.indicators = this.recordedIndicators;
    },

    onReplayComplete: function() {
      this.indicators = this.postIndicators;
    },

    onEraseRecording: function() {
      this._resetIndicators();
      this.indicators = this.preIndicators;
    },
  
    turnInfo: function(indicator){
        if (debug) console.log('QuerypointPanel.turnInfo: ', arguments);
        QuerypointPanel.TurnScrubberViewModel.turnViewModel.showTurn(indicator.turn.turnNumber);
        var dropDown = document.querySelector('.turnView');
        dropDown.style.display = 'block';
    },
    
    pageWasReloaded: function(runtimeInstalled, runtimeInstalling) {
      this.turnViewModel.showTurn(0);
      this.recorder.pageWasReloaded(runtimeInstalled, runtimeInstalling);
    }
  };
}());
