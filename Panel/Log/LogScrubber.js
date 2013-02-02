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
      this.loadStarted = ko.observable(0);
      this.loadEnded = ko.observable(0);
      this.turnStarted = ko.observable(0);
      this.turnEnded = ko.observable(0);

      // TODO depends on resize of logElement
      this.rangeShowable = ko.computed(function(){
        var height = logElement.clientHeight;
        var lineHeight = 13;
        var lines = Math.ceil(height / lineHeight) + 1;
        return lines;
      }.bind(this));


      this._initMouse();

      var panel =  document.querySelector('.panel');
      var logScrubberElement = document.querySelector('.logScrubber');
      var logFloat = document.querySelector('.floaty');

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
        }
        var allTurns = document.querySelectorAll('.turnNumber');
        var currentLoad = node.querySelectorAll('.turnNumber');
        for(var i = 0 ; i < allTurns.length ; i++){
            if(Array.prototype.indexOf.call(currentLoad, allTurns[i]) != -1) allTurns[i].classList.remove('hiddenTurn');
            else allTurns[i].classList.add('hiddenTurn');
        }
    }

  };
}());
