// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('LogScrubber', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.EventTurn = {
    initialize: function(logScrubber, project, tracequeries) {
      
      var eventTurn = this;

      this.showTurn = ko.observable(0);
      
      this.turnInformation = ko.computed(function(){
        return 'Turn ' + eventTurn.showTurn() + ' on load ' + logScrubber.showLoad().load + '.';
      });

      this.createFileURL = function(eventInfo) {
        // the QPRuntime only has the function start offset.
        var offset = parseInt(eventInfo.offset, 10);
        var functionTree = project.find(eventInfo.filename, offset);
        var startOffset = 0;
        var endOffset = 0;
        if (functionTree) {
          startOffset = functionTree.location.start.offset;
          endOffset = functionTree.location.end.offset;
        }
        return project.createFileURL(eventInfo.filename, startOffset, endOffset);
      }

      this.summary = ko.computed(function(){
        try {
            var currentTurnNumber = eventTurn.showTurn(); // updated by user interaction
            if (currentTurnNumber) {  
              var load = logScrubber.showLoad();
              if (load.turns) {
                var turn = load.turns()[currentTurnNumber - 1];
                if (turn) {
                  if (!turn.event.url) {
                    turn.event.url = eventTurn.createFileURL(turn.event);
                  }
                  return turn.event;
                } else {
                  console.warn('LogScrubber.summary no entry in load.turns() for ' + (currentTurnNumber - 1), Object.keys(load.turns()));
                }
              } else {
                if (load.load !== '-') {
                  console.warn('LogScrubber.summary no .turns in load', load);
                }
              }
            } 
        } catch(err) {
          console.warn('LogScrubber.summary fails ' + err, err);
        }
      });

      this.isAsynchronous = ko.computed(function(){
          var summary = eventTurn.summary();
          return summary && summary.eventType === 'Asynchronous';
      });

      this.turnMessages = ko.computed(function(){
        var turns = logScrubber.showLoad().turns;
        var messages = [];
        if (turns) {
          var turnIndex = eventTurn.showTurn() - 1;
          var turn = turns()[turnIndex];
          if (turn)
            return turn.messages();
        }
        return messages;
      });

      this.turnChain = ko.computed(function(){
        var summary = eventTurn.summary();
        if (!summary) return false; 
        var result = [];
        var target = summary.previousTurn;
        if (!target) return false;
        while (target) {
            result.push({turnNumber: target.turn});
            target = target.event.previousTurn;
        }
        return result;
      });

      this.triggeredEvents = ko.computed(function(){
        var summary = eventTurn.summary();
        if (!summary || summary.firedEvents.length === 0) return false;
        return summary.firedEvents.map(function(turnNumber){
            return {turnNumber: turnNumber};
        });
      });

      this.addedEvents = ko.computed(function(){
        var summary = eventTurn.summary();
        if (!summary || summary.addedEvents.length === 0) return false;
        return summary.addedEvents.map(function(detail){
            return {detail: detail};
        });
      });

      // 'this' is an element in the array returned by turnChain or triggeredEvents
      this.switchTurn = function(){
        QuerypointPanel.LogScrubber.eventTurn.showTurn(this.turnNumber);
        QuerypointPanel.LogScrubber.showMessage(0);
      }

      this.elementQueryProvider = new QuerypointPanel.ElementQueryProvider(project);
      this._tracequeries = tracequeries; // TODO encapsulate in panel and pass query vai appendQuery
    },    

    revealElement: function(){
        console.error("TODO reveal element");
    },

    traceElement: function(eventTurn){
      console.log("trace target of turn " + this.showTurn(), eventTurn);
      var summary = eventTurn.summary(); 
      var selector = summary.target;
      var functionURL = summary.url;
      this.query = this.elementQueryProvider.getQueriesBySelector(selector, functionURL)[0];
      if (this.query && !this.query.isActive()) {
        this.query.activate(this._tracequeries().length);
        this._tracequeries.push(this.query);        
      }
      // User has asked for an action, now show them where the results will appear.
      eventTurn.close();
    },

    highlightElement: function(){
        var DOM, highlightConfig, selector;
        selector = this.summary().target;
        if (!selector) {
          return;
        }
        DOM = chrome.devtools.protocol.DOM.prototype;
        highlightConfig = {
            contentColor: {r: 0, g: 0, b: 255, a: 0.4},
            borderColor: {r: 0, g: 0, b: 255, a: 0.4},
            marginColor: {r: 0, g: 0, b: 255, a: 0.4},
            paddingColor: {r: 0, g: 0, b: 255, a: 0.4},
        }
        DOM.getDocument(function(error, root){
            if (selector === '#document'){
                DOM.highlightNode(highlightConfig, root.nodeId, '');
            } else {
                DOM.querySelector(root.nodeId, selector, function(error, node){
                    DOM.highlightNode(highlightConfig, node, '', function(error){
                        if (debug && error) console.error('LogScrubber.highlightElement FAILED:', error);
                        // else just ignore the error, occurs in testing
                    });
                });
            }
        });
    },

    unhighlight: function(){
        chrome.devtools.protocol.DOM.prototype.hideHighlight( );
    },

    close: function() {      
      var eventTurnInfo = document.querySelector('.eventTurn');
      eventTurnInfo.style.display = 'none';
    }

  }

  QuerypointPanel.LogScrubber = {
    
    initialize: function(logElement, project, tracequeries) {
      this.loads = ko.observableArray();

      this.trackLatestMessage = ko.observable(true);
      
      this.lastShown = ko.computed(function() {
        if (debug) console.log('LogScrubber.lastShown ' + this.loads().length + " loads");
        return this.loads().length;
      }.bind(this));
      
      var self = this;
      this.lastLoad = 0;
      this.loadStarted = ko.observable(0);
      this.loadEnded = ko.observable(0);
      this.turnStarted = ko.observable(0);
      this.turnEnded = ko.observable(0);
      this.showLoad = ko.observable({load: '-'});
      this.showMessage = ko.observable(0);

      this.eventTurn = QuerypointPanel.EventTurn;
      this.eventTurn.initialize(this, project, tracequeries);

      // TODO depends on resize of logElement
      this.rangeShowable = ko.computed(function(){
        var height = logElement.clientHeight;
        var lineHeight = 13;
        var lines = Math.ceil(height / lineHeight) + 1;
        return lines;
      }.bind(this));

      this.displayLoad = function(object){
        var button = document.querySelector('.recordIndicator');
        var marker = document.querySelector('.recordMarker');
        if (button && button.classList.contains('on')) {
            self.recordData.stopRecording(button, marker);
        }

        var loadElement = document.querySelector('div.loadNumber[load="' + self.showLoad().load + '"]');
        if (loadElement) loadElement.classList.remove('selectedLoad');
        self.showLoad(object);

        loadElement = document.querySelector('div.loadNumber[load="' + self.showLoad().load + '"]');
        if (loadElement) loadElement.classList.add('selectedLoad');

        if (self.isCurrentLoad() ){
            self.storedMessages([]);
            if (self.recordData.start !== -1) {
              marker = document.querySelector('.recordMarker');
              marker.style.display = 'block';
              marker.innerHTML = '&#x25B6';
            }
            self.updateSize();
        } else {
          self.storedMessages(self.compressMessages(object.messages));
          var maxMessages = logScrubberElement.offsetWidth - 30;
          self._setMessageWidth( maxMessages / self.storedMessages().length );
        }
        object.messages[object.messages.length - 1].scroll.scrollIntoView(false);
      }

      this._initMouse();

      var panel =  document.querySelector('.panel');
      var logScrubberElement = document.querySelector('.logScrubber');
      var logFloat = document.querySelector('.logContainer');
      var logElement = document.querySelector('.logView');
      var loadElement = document.querySelector('.loadList');
      var dropDown = document.querySelector('.eventTurn');
      var currentLoad = document.querySelector('.currentLoad');
      var nextLoad = document.querySelector('.nextLoad');
      var recordButton = document.querySelector('.recordIndicator');
      var playButton = document.querySelector('.recordMarker');

      this.preMessages = ko.observableArray();          // Messages before the play button
      this.postMessages = ko.observableArray();         // Messages after record button
      this.recordedMessages = ko.observableArray();     // Messages that occured in recorded turns
      this.storedMessages = ko.observableArray();       // All messages in a load
      this.messages = this.preMessages;                 // Points to message array where new messages go

      // To scale messages width of indicator decreases until they are 1 pixel wide
      // If number of indicators exceed width of window, each indicator will represent more than one message
      this._scale = 1;                                  // Number of messages in each indicator
      this._addedMessages;                              // Number of messages added to the last indicator

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
        var maxMessages = logScrubberElement.offsetWidth - 30;
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
        var maxMessages = logScrubberElement.offsetWidth - 40;
        if (self.recordData.start !== -1) maxMessages -= 10;
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

      // Method clears messages arrays
      this._clearMessages = function(){
          self.preMessages([]);
          self.postMessages([]);
          self.messages = self.preMessages;
      }

      // Method that changes css style to change width and border of indicators
      // This method has hardcoded the rule number and stylesheet number
      // The modified rule is in a stylesheet by itself eventIndicator.css
      this._setMessageWidth = function(width) {
        if (width < 3) document.styleSheets[4].cssRules[0].style.borderLeftWidth = '0px';
        else document.styleSheets[4].cssRules[0].style.borderLeftWidth = '2px';
        if (width > 10) document.styleSheets[4].cssRules[0].style.width = '10px';
        else document.styleSheets[4].cssRules[0].style.width = width + 'px';
      }

      this.showLoadNumber = ko.computed(function(){
          return self.showLoad().load;
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

      this.showNext = ko.computed( function(){
          var load = self.showLoad().load;
          if (load === '-' || load == self.loadStarted()) {
              nextLoad.onmousedown = null;
              return '-';
          } else {
              nextLoad.onmousedown = function() {
                  var next = self.showLoad().next;
                  if (next) 
                    self.displayLoad(next);
                  else 
                    self.displayLoad({load: '-'});
              };
              return self.showLoad().load+1;
          }
      });

      this.isCurrentLoad = ko.computed( function(){
        return self.showLoad().load == self.loadStarted();
      });

      this.isPastLoad = ko.computed( function(){
        return self.loadStarted() && (self.showLoad().load != self.loadStarted());
      });

      this.recordData = {
          load: 0,
          start: -1,    // First event recorded
          end:   0,     // First event not recorced
          play: function(){
            for (var i = self.recordData.start; i < self.recordData.end; i++){
              // Injects a command that builds and event and dispatches to taget.
              var event = self.recordData.load.turns()[i].event;
              var command = 'var target = document.querySelector("' + event.target + '"); ';
              command += 'var event = document.createEvent("Events"); ';
              command += 'event.initEvent("' + event.eventType + '", ' + event.eventBubbles + ', ' + event.eventCancels + '); ';
              command += 'target.dispatchEvent(event); ';
              chrome.devtools.inspectedWindow.eval(command);
            }
          },
          stopRecording: function(button, marker) {
            if (arguments.length == 0){
              self.recordData.end = self.showLoad().turns().length;
            } else {
              marker.innerHTML = '&#x25B6';
              self.recordData.end = self.showLoad().turns().length;
              self.messages = self.postMessages;
              marker.classList.remove('on');
              button.classList.remove('on');
              marker.onmousedown = null;
            }
          }
      }

      dropDown.onmouseout = function(event) {
          var e = event.toElement || event.relatedTarget;
          if (self.isOurRelatedTarget(e, this)) return false;
          dropDown.style.display = 'none';
      }
    
      currentLoad.onmouseover = function(){
          dropDown.style.display = 'none';
          loadElement.style.display = 'block';
      }
    
      loadElement.onmouseout = function(event) {
          var e = event.toElement || event.relatedTarget;
          if (self.isOurRelatedTarget(e, loadElement)) return false;
          loadElement.style.display = 'none';
      }
    
      logElement.onmouseout = function(){
          dropDown.style.display = 'none';
          loadElement.style.display = 'none';
      };

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
      document.querySelector('.logScrubber').style.display = 'none';
      setTimeout( function(){ document.querySelector('.logScrubber').style.display = 'block'; } , 1);
    },

    // Event mouseout triggers when mouse goes into child nodes
    // If we are looking to hide target, we must assure element focused isn't a descendant
    isOurRelatedTarget: function(element, target) {
      while (element && element.parentNode) {
        if (element.parentNode === target ||  element === target) {
            if (element.preventDefault) element.preventDefault();
            return true;
        }
        element = element.parentNode;
      }
      return false;
    },
  
    selectLast: function(node){
        if(!node.classList) return;
        var element = document.querySelector('.selectedLoad');
        if(element) element.classList.remove('selectedLoad');
        node.classList.add('selectedLoad');
    },
  
    focusLog: function (elem) {
      if(typeof(elem.scroll) == 'undefined'){
          // Clicked on Turn Indicator
          // Focus on some element of the turn or ignore?
          // What if no messages appeared in this turn?
          document.querySelector().scrollIntoView(false);
      } else {
        elem.scroll.scrollIntoView(false);
        var logFloat = document.querySelector('.logContainer');
        logFloat.scrollTop += logFloat.offsetHeight / 2 ;
      }
    },
  
    turnInfo: function(){
        if (debug) console.log('QuerypointPanel.turnInfo: ', arguments);
        var dropDown = document.querySelector('.eventTurn');
        var loadElement = document.querySelector('.loadList');
        var messages = document.querySelector('.eventTurn .messages');
        dropDown.style.display = 'block';
        loadElement.style.display = 'none';
        QuerypointPanel.LogScrubber.eventTurn.showTurn(this.turn);
        QuerypointPanel.LogScrubber.showMessage(this.position);
        messages.scrollTop = 15 * this.position;
    },
  
    startRecord: function(){
      var logScrubber = this;
      if (logScrubber.showLoad().load != logScrubber.loadStarted()) return;
      var button = document.querySelector('.recordIndicator');
      var marker = document.querySelector('.recordMarker');
      if (button.classList.contains('on')) {
          logScrubber.recordData.stopRecording(button, marker);
      } else {
          try{
            var current = logScrubber.showLoad().messages.length;
          } catch (err) {
              return;             // Load hasn't started
          }
          for (var i = 0; i < logScrubber.recordedMessages().length; i++) logScrubber.preMessages().push(logScrubber.recordedMessages()[i]);
          for (var i = 0; i < logScrubber.postMessages().length; i++) logScrubber.preMessages().push(logScrubber.postMessages()[i]);
          logScrubber.preMessages.valueHasMutated();
          logScrubber.recordedMessages([]);
          logScrubber.postMessages([]);
          logScrubber.updateSize();
  
          logScrubber.messages = logScrubber.recordedMessages;
  
          logScrubber.recordData.load = logScrubber.showLoad();
          logScrubber.recordData.start = logScrubber.showLoad().turns().length;
          logScrubber.recordData.end = -1;
          
          marker.onmousedown = function(){ logScrubber.recordData.stopRecording(button, marker);};
          marker.innerHTML = '&#9679;';
          marker.style.display = 'block';
          marker.classList.add('on');
          button.classList.add('on');
      }
    }
  };
}());
