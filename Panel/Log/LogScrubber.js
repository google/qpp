// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var debug = DebugLogger.register('LogScrubber', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.LogScrubber = {
    
    initialize: function(logElement) {
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
      this.showTurn = ko.observable(0);
      this.showMessage = ko.observable(0);

      this.turnMessages = ko.computed(function(){
          if(!self.showLoad().turns ||  !self.showLoad().turns()[self.showTurn() - 1]) return [];
          return self.showLoad().turns()[self.showTurn() - 1].messages();
      });

      this.turnInformation = ko.computed(function(){
        return 'Turn ' + self.showTurn() + ' on load ' + self.showLoad().load + '.';
      });

      this.eventInformation = ko.computed(function(){
        try{
            var eventInfo = self.showLoad().turns()[self.showTurn() - 1].event.split('|');
            var str = 'Function ' + eventInfo[0] + ' triggered by ' + eventInfo[1] + ' on target ' + eventInfo[2];
            return str;
        }catch(err){
          console.warn('LogScrubber.eventInformation fails ' + err, err);
          return 'Undefined event';
        }
      });

      // TODO depends on resize of logElement
      this.rangeShowable = ko.computed(function(){
        var height = logElement.clientHeight;
        var lineHeight = 13;
        var lines = Math.ceil(height / lineHeight) + 1;
        return lines;
      }.bind(this));

      this.displayLoad = function(object){
        self.showLoad(object);
        object.messages[object.messages.length - 1].scroll.scrollIntoView(false);
      }

      this._initMouse();

      var panel =  document.querySelector('.panel');
      var logScrubberElement = document.querySelector('.logScrubber');
      var logFloat = document.querySelector('.floaty');
      /*
      function getMargin(elem){
        var str = elem.style.marginLeft;
        if(!str) str = '0px';
        return parseInt(str.substr(0,str.length - 2));
      }
      
      logScrubberElement.onmousewheel = function(event){
        var newPosition = getMargin(logScrubberElement) + event['wheelDelta'];
        if(newPosition < 0){
            logScrubberElement.style.marginLeft= newPosition.toString() + 'px';
            //TODO: Adjust the scroll on log with scroll on scrubberBox
            logFloat.scrollByLines(event['wheelDelta'] < 0 ? 1 : -1);
        }else{
            logScrubberElement.style.marginLeft = '0px';
            logFloat.scrollTop = 0;
        }
      }

      logScrubberElement.onmousedown = function(event){
        var curX = event.x;
        var start = getMargin(logScrubberElement);
        var lastPosition = 0;
        event.preventDefault();

        panel.onmousemove = function(event){
            var newPosition = start + (event.x - curX);
            if (newPosition < 0) {
                logScrubberElement.style.marginLeft = (newPosition).toString() + 'px';
                //TODO: Adjust scroll on log with scrubberBox
                logFloat.scrollTop+= (newPosition > lastPosition ? -2 : 2);
                lastPosition = newPosition;
            }
        }
      }

      panel.onmouseup = function(){ panel.onmousemove = null; }
      */
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
      if(arguments.length == 2){
          node = event.currentTarget;
      }else{
          node = arguments[0].parentElement;
      }

      var allTurns = document.querySelectorAll('span.turns');
      var currentLoad = node.querySelector('span.turns');
      
      while(!currentLoad){
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

  };
}());
