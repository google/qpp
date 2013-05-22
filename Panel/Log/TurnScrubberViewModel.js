// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('TurnScrubberViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.TurnScrubberViewModel = {
    
    initialize: function(project, tracequeries, sessionViewModel) {
      this.sessionViewModel = sessionViewModel;
      this.recorder = QuerypointPanel.Recorder.initialize(sessionViewModel.loadListViewModel, this);
      
      this.trackLatestMessage = ko.observable(true);
      
      var self = this;
      this.lastLoad = 0;
      this.turnStarted = ko.observable(0);
      this.turnEnded = ko.observable(0);
      this.showMessage = ko.observable(0);

      this.turnViewModel = QuerypointPanel.TurnViewModel;
      this.turnViewModel.initialize(sessionViewModel.loadListViewModel, project, tracequeries);

      var logView = document.querySelector('.logView');
      
      // TODO depends on resize of logView
      this.rangeShowable = ko.computed(function(){
        var height = logView.clientHeight;
        var lineHeight = 13;
        var lines = Math.ceil(height / lineHeight) + 1;
        return lines;
      }.bind(this));

      this._initMouse();

      var panel =  document.querySelector('.panel');
      var sessionView = document.querySelector('.sessionView');
      var logFloat = document.querySelector('.messageView');
      var loadElement = document.querySelector('.loadListView');
      var dropDown = document.querySelector('.turnView');
      
      this.preMessages = ko.observableArray();          // Messages before the play button
      this.postMessages = ko.observableArray();         // Messages after record button
      this.recordedMessages = ko.observableArray();     // Messages that occured in recorded turns
      this.storedMessages = ko.observableArray();       // All messages in a load
      this.messages = this.preMessages;                 // Points to message array where new messages go

      // To scale messages width of indicator decreases until they are 1 pixel wide
      // If number of indicators exceed width of window, each indicator will represent more than one message
      this._scale = 1;                                  // Number of messages in each indicator
      this._addedMessages;                              // Number of messages added to the last indicator

      this.updateOnLoadSelection = function(currentLoadIsSelected, load) { // TODO MDV
        this.recorder.stopIfRecording();

        if (currentLoadIsSelected) {
          self.storedMessages([]);
          self.updateSize();
        } else {
          self.storedMessages(self.compressMessages(load.messages));
          var maxMessages = sessionView.offsetWidth - 30;           // FIXME
          self._setMessageWidth( maxMessages / self.storedMessages().length );
        }
      }

      // Method adds a message to the array messages
      this._addMessage = function(message){
        if (this._scale == 1) {
          // If scale is 1 then each message is an indicator, so it is added directly
          self.messages().push(message);
        } else {
          if (this._addedMessages == this._scale) {
            // If number of messages in last indicator equals the scale factor then a new indicator needs to be added
            self.messages().push({severity: message.severity, turn: message.turn, scroll: message.scroll, position: message.position});
            self._addedMessages = 0;
          } else {
            // If not, then merge the message with the last indicator
            // The color of the indicator depends on the messages that represent the indicator. 'turn' has precedence before 'error' and 'warn' and 'error' has precedence over 'warn'.
            self._addedMessages += 1;
            var lastMessage = self.messages()[self.messages().length - 1];
            if (message.severity === 'warn' && lastMessage.severity === 'log') lastMessage.severity = 'warn';
            if (message.severity === 'error' && lastMessage.severity !== 'turn') lastMessage.severity = 'error';
            if (message.turn === 'turn') {
                lastMessage.severity = 'turn';
                lastMessage.turn = message.turn;
                lastMessage.position = 0;
            }
          }
        }
      }

      // This method takes an array of messages and if these don't fit in the width of the screen
      // then we merge messages together in such way to maximize the occupied space in scrubber bar
      this.compressMessages = function(messages){
        var maxMessages = sessionView.offsetWidth - 30;
        if(messages.length < maxMessages) return messages;
        // perPixel is the ammount of messages that are going to be merged together
        var perPixel = Math.floor(messages.length / maxMessages);
        var result = [];
        var message;
        for (var i = 0; i < messages.length; i++) {
          message = messages[i];
          if (i % perPixel == 0) { // every perPixel-th message whe create a new indicator
            result.push({severity: message.severity, turn: message.turn, scroll: message.scroll, position: message.position});
          } else {
            var lastMessage = result[result.length - 1];
            if (message.severity === 'warn' && lastMessage.severity === 'log') lastMessage.severity = 'warn';
            if (message.severity === 'error' && lastMessage.severity !== 'turn') lastMessage.severity = 'error';
            if (message.turn === 'turn') {
                lastMessage.severity = 'turn';
                lastMessage.turn = message.turn;
                lastMessage.position = 0;
            }
          }
        }
        return result;
      }

      // Method calculates size of indicator, if the number of indicators exceed the width of the screen arrays get scaled
      // to half their size.
      this.updateSize = function(){
        self.messages.valueHasMutated();
        var maxMessages = sessionView.offsetWidth - 40;
        var joinMessages = self.preMessages().length + self.recordedMessages().length + self.postMessages().length;

        if (joinMessages < maxMessages) {
          var width = Math.floor(maxMessages / joinMessages);
          self._setMessageWidth(width);
        } else {
          self._scale *= 2;
          self._addedMessages = 0;
          if (self.messages !== self.preMessages) self._scaleMessages(self.preMessages);
          if (self.messages !== self.recordedMessages) self._scaleMessages(self.recordedMessages);
          self._scaleMessages(self.messages);
          this.updateSize();
        }
      }

      // Method that takes an array of messages and reduces size to half by merging pair of messages together
      this._scaleMessages = function(messages) {
        var len = messages().length;
        if (len % 2 == 1){
            messages.push(messages()[len-1]);
            len++;
        }

        for (var i = 0; i < len / 2; i++){
            var message = {severity: null, position: null, scroll: null, turn: null};

            message.severity = 'log';   // Defines color of indicator in scrubber bar turn>error>warn>log 
            if (messages()[i * 2].severity === 'warn' || messages()[i * 2 + 1].severity === 'warn') message.severity = 'warn';
            if (messages()[i * 2].severity === 'error' || messages()[i * 2 + 1].severity === 'error') message.severity = 'error';
            if (messages()[i * 2].severity === 'turn') message.severity = 'turn';

            message.position = messages()[i * 2].position;      // Position is the relative order of the messages among other messages, used to focus message on mouseover.
            message.scroll = messages()[i * 2].scroll;          // Scroll is the element that gets focused in console when indicator is clicked
            message.turn = messages()[i * 2].turn;              // Turn number of the indicator
            if (messages()[i * 2 + 1].severity === 'turn'){     // If a message is a Turn then we'll take it as more relevant than previos messages
                message.severity = 'turn';
                message.position = 0;
                message.turn = messages()[i * 2 + 1].turn;
            }
            messages()[i] = message;
        }
        messages.splice(messages().length / 2);
        messages.valueHasMutated();
      }

      this._clearMessages = function(){  // TODO vs resetMessages
          this.preMessages([]);
          this.postMessages([]);
          this.recordedMessages([]);
          this.messages = self.preMessages;
      }

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

      this.showLoadNumber = ko.computed(function(){
          return sessionViewModel.loadListViewModel.showLoad().loadNumber;
      });

      // Method is currently *not* being used
      // It was replaced by compressMessages and _scaleMessages
      // Given a floating point value perPixel less than 1 and an array of messages
      // Returns an array of indicators such that the number of indicators fit in the whole scrubber bar
      this._downSizeMessages = function(perPixel, joinMessages) {
        var last = 0, next = 0;
        var showMessages=[];
        var hasError, hasTurn, hasWarn, lastTurn;

        while (next != joinMessages.length) {
            if (!hasTurn) {
                hasError = hasTurn = hasWarn = false;
            } else {
                hasTurn = false;
            }
            if (last + perPixel > joinMessages.length)
              last = joinMessages.length; 
            else 
              last = last + perPixel;

            for (; next < last; next++) {
                var severity = joinMessages[next].severity;
                if (severity === 'turn') hasTurn = true;
                if (severity === 'warn') hasWarn = true;
                if (severity === 'error') hasError = true;
            }
            lastTurn = joinMessages[next-1].turn;
            showMessages.push({
              severity: hasTurn ? 'turn' : (hasWarn ? 'warn' : (hasError ? 'error' : 'log')), 
              turn:lastTurn, 
              scroll: joinMessages[next-1].scroll 
            });
        }
      }


      dropDown.onmouseout = function(event) {
          var e = event.toElement || event.relatedTarget;
          if (sessionViewModel.isOurRelatedTarget(e, this)) return false;
          dropDown.style.display = 'none';
      }
    
      loadElement.onmouseout = function(event) {
          var e = event.toElement || event.relatedTarget;
          if (sessionViewModel.isOurRelatedTarget(e, loadElement)) return false;
          loadElement.style.display = 'none';
      }
    
      logView.onmouseout = function(){
          dropDown.style.display = 'none';
          loadElement.style.display = 'none';
      };
    
      var turnScrubberView = document.querySelector('.turnScrubberView');
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
      this._clearMessages();
    },

    _resetMessages: function() {
      for (var i = 0; i < this.recordedMessages().length; i++) 
        this.preMessages().push(this.recordedMessages()[i]);
      for (var i = 0; i < this.postMessages().length; i++) 
        this.preMessages().push(this.postMessages()[i]);

      this.preMessages.valueHasMutated();
      this.recordedMessages([]);
      this.postMessages([]);
      this.updateSize();
    },

    onStartRecording: function() {
      this._resetMessages();
      this.messages = this.recordedMessages;
    },
  
    onStopRecording: function() {
      this.messages = this.postMessages;
    },

   onReplayBegins: function() {
      this._resetMessages();
      this.messages = this.recordedMessages;
    },

    onReplayComplete: function() {
      this.messages = this.postMessages;
    },

    onEraseRecording: function() {
      this._resetMessages();
      this.messages = this.preMessages;
    },

    focusLog: function (message) {
      if (message.logView) {
        message.logView.scrollIntoView(false);
        var logFloat = document.querySelector('.messageView');
        logFloat.scrollTop += logFloat.offsetHeight / 2 ;
      }
    },
  
    turnInfo: function(message){
        if (debug) console.log('QuerypointPanel.turnInfo: ', arguments);
        QuerypointPanel.TurnScrubberViewModel.turnViewModel.showTurn(message.turn.turnNumber);
        QuerypointPanel.TurnScrubberViewModel.showMessage(message.position);
        var dropDown = document.querySelector('.turnView');
        var loadElement = document.querySelector('.loadListView');
        var messages = document.querySelector('.turnView .messages');
        dropDown.style.display = 'block';
        loadElement.style.display = 'none';
        if (messages)
          messages.scrollTop = 15 * message.position;
    },
    
    pageWasReloaded: function(runtimeInstalled, runtimeInstalling) {
      this.turnStarted(0);
      this.turnEnded(0);
      this.turnViewModel.showTurn(0);
      this.recorder.pageWasReloaded(runtimeInstalled, runtimeInstalling);
    }
  };
}());
