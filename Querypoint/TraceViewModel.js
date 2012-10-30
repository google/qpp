
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.Querypoint = window.Querypoint || {};
  
  Querypoint.TraceViewModel = function(root, editor) {
    // Model
    this._root = root;
    this._tracesByTree = [];
    // ViewModel
    this._hasTraceData = ko.observable('false');
    this._exploringMode = ko.observable(false);
    this._currentTreeIndex = ko.observable();
    this._currentTree = ko.computed({
      read: function() {
        var index = this._currentTreeIndex(); // we need to call the observable to trigger dependency
        return (typeof index === 'number') ? this._tracesByTree[index] : undefined;
      }.bind(this),
      deferEvaluation: true
    });
    this._currentTraces = ko.computed({
      read: function() {
        var tree = this._currentTree();
        if (tree) {
          var traces = tree.location.trace;
          if (traces) {
            this._hasTraceData('true');
            return traces.map(function(trace) {
              var start = tree.location.start;
              var end = tree.location.end;
              return {
                turn: trace.turn,
                activation: trace.activation,
                tooltip: start.source.name + ' Line: ' + start.line,
                url: start.source.name + '?start=' + start.offset + '&end=' + end.offset,
                startOffset: start.offset,
                endOffset: end.offset,
                value: trace.value,
                commandName: '&#x2799;&#x2263;'
              };
            });
          }
        }
      }.bind(this),
      deferEvaluation: true
    });
    this._currentLocation = ko.computed(function() {
      var tree = this._currentTree(); 
      if (!tree) return;
      return tree.location;
    }.bind(this));
    
    this._currentExpression = ko.computed(function() {
      var location = this._currentLocation();
      if (!location) return "";
      
      var line = location.start.line;
      editor.setLineNumberClass(line, 'traceViewedLine');
      var traceViewedLine = document.querySelector('.traceViewedLine');
      editor.removeLineNumberClass(line, 'traceViewedLine');
      
      var clone = traceViewedLine.cloneNode(true);
      clone.classList.remove('traceViewedLine');
      var box = editor.createTokenBox(location);
      box.style.top = "0px";
      clone.appendChild(box);
      return clone.outerHTML;
    }.bind(this));
    
    this._currentOffsets = ko.computed({
      read: function() {
        var location = this._currentLocation()
        return location.start.offset + '-' + location.end.offset;
      }.bind(this),
      deferEvaluation: true
    });
    
    ko.applyBindings(this, document.querySelector('.QPOutput'));

   $(".QPOutput").live("click", function(jQueryEvent) {
      console.log("Click ", jQueryEvent.target);
      var url = jQueryEvent.target.getAttribute('data-url');
      if (url) {
        alert("TODO: navigate editor to "+url);
      } // else the user did not click on something interesting.
    });
  }
  
  Querypoint.TraceViewModel.prototype = {

    setModel: function(tree) {
      if (!tree.location || !tree.location.trace) {
        console.warn("Don't call setModel without a tree.location.trace!");
        return;
      }
      var index = this._tracesByTree.indexOf(tree);
      if (index !== -1) {
        this._currentTreeIndex(index);
      } else {
        this._currentTreeIndex(this._tracesByTree.push(tree) - 1);
      }
    },
    
    setExploring: function(active) {
      this._exploringMode(active);
    }
  };
}());
