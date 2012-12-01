
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TraceViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;
    this._panel = panel;

    // all of the query results for this file
    this.tracepoints = ko.observableArray();

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
        this._treeHanger = new QuerypointPanel.TreeHangerTraceVisitor(project, rootTree, this.tracepoints);  
      } 
      return this._treeHanger;
    },
    update: function() {
      var treeRoot = this._fileViewModel.treeRoot();
      if (treeRoot) {
        var treeHanger = this.treeHanger(this._fileViewModel.project, treeRoot);
        this._panel.tracequeries().forEach(function(tq){
          tq.extractTracepoints(this._fileViewModel.treeRoot(), function (tracepoint){
            if (tracepoint) {
              this.tracepoints.push(tracepoint);
            } // else no data?
          }.bind(this));
        }.bind(this));
      }
    }
  };
}());
