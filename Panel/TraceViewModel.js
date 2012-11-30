
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TraceViewModel = function(fileViewModel, panel) {

    // all of the query results for this file
    this.tracepoints = ko.observableArray();
    
    this._tracepoints = ko.computed(function() {
      var additions = false;
      var treeRoot = fileViewModel.treeRoot();
      if (fileViewModel.project && treeRoot) {
        var treeHanger = this.treeHanger(fileViewModel.project, treeRoot);
        panel.tracequeries().forEach(function(tq){
          tq.extractTracepoints(fileViewModel.treeRoot(), function (traceData){
            // Filling the _tracepoints async...
            var hasTracepoints = traceData && treeHanger.visitTrace(treeRoot, traceData, this.tracepoints);    
            additions = additions || hasTracepoints;
          });
        }.bind(this));
      }
      return additions;
    }.bind(this));

    // Query results for the current token in this file.
    this.currentTraces = ko.computed(function() {
        var tree = fileViewModel.tokenViewModel.tokenTree();

        if (tree && panel.tracequeries().length) {
          var traces = tree.location.traces;
          if (traces) {
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
          } 
        }
      }.bind(this));

   $(".QPOutput").live("click", function(jQueryEvent) {
      console.log("Click ", jQueryEvent.target);
      var url = jQueryEvent.target.getAttribute('data-url');
      if (url) {
        panel.commands.openChainedEditor(url, editor);

      } // else the user did not click on something interesting.
    });
  }
  
  QuerypointPanel.TraceViewModel.prototype = {
    treeHanger: function(project, rootTree) {
      if (!this._treeHanger) {
        this._treeHanger = new QuerypointPanel.TreeHangerTraceVisitor(project, rootTree);  
      } 
      return this._treeHanger;
    },
  };
}());
