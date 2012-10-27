
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.Querypoint = window.Querypoint || {};
  
  Querypoint.TraceViewModel = function(root, editor) {
    // Model
    this._root = root;
    this._tracesByTree = [];
    // ViewModel
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
          return traces.map(function(trace) {
            return {
              turn: trace.turn,
              activation: trace.activation,
              fileName: tree.location.start.source.name,
              start: tree.location.start.offset,
              end: tree.location.end.offset,
              value: trace.value,
              fileRune: "&#x2190;"
            };
          });
        }

      }.bind(this),
      deferEvaluation: true
    });
    this._currentLocation = ko.computed(function() {
      var tree = this._currentTree(); 
      if (!tree) return;
      return tree.location;
    }.bind(this));
    
    this._currentSource = ko.computed(function() {
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
    }
  };
}());
