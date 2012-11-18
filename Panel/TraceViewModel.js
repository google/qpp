
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TraceViewModel = function(tokenViewModel, panel) {
  
    // ViewModel
    this._hasTraceData = ko.observable('false');
    this._exploringMode = ko.observable(false);

    this.currentTraces = ko.computed(function() {
        var tree = tokenViewModel.tokenTree();
        if (tree) {
          var traces = tree.location.traces;
          if (traces) {
            this._hasTraceData('true');
            return traces.map(function(trace) {
              var start = tree.location.start;
              var end = tree.location.end;
              return {
                load: trace.load,
                turn: trace.turn,
                activation: trace.activation,
                tooltip: start.source.name + ' Line: ' + start.line,
                url: panel.urlFromLocation(tree.location),
                startOffset: start.offset,
                endOffset: end.offset,
                value: trace.value,
                commandName: '&#x2799;&#x2263;'
              };
            });
          } else {
            this._hasTraceData('false');
          }
        }
      }.bind(this));

    ko.applyBindings(this, document.querySelector('.traceView'));

   $(".QPOutput").live("click", function(jQueryEvent) {
      console.log("Click ", jQueryEvent.target);
      var url = jQueryEvent.target.getAttribute('data-url');
      if (url) {
        panel.commands.openChainedEditor(url, editor);

      } // else the user did not click on something interesting.
    });
  }
  
  QuerypointPanel.TraceViewModel.prototype = {

  };
}());
