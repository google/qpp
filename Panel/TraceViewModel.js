
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
              var traceViewModel = {};
              Object.keys(trace).forEach(function(prop) {
                traceViewModel[prop] = trace[prop];
              });
              // TODO traceViewModel.trace, .tree, then methods.
              var start = tree.location.start;
              var end = tree.location.end;
              traceViewModel.tooltip = start.source.name + ' Line: ' + start.line;
              traceViewModel.url = panel.urlFromLocation(tree.location);
              traceViewModel.startOffset = start.offset;
              traceViewModel.endOffset = end.offset;
              traceViewModel.commandName = '&#x2799;&#x2263;';
              return traceViewModel;
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
    swapTracePrompt: function(tracepoint) {
      var traces = this.currentTraces();
      var swap = -1;
      traces = traces.forEach(function(trace, index) {
        if (trace.isPrompt && trace.query == tracepoint.query) {
           swap = index;
        }
      });
      if (swap != -1) {
        traces[swap] = trace;
        return true;
      }
    },
    update: function() {
      var treeRoot = this._fileViewModel.treeRoot();
      if (treeRoot) {
        var treeHanger = this.treeHanger(this._fileViewModel.project, treeRoot);
        this._panel.tracequeries().forEach(function(tq){
          tq.extractTracepoints(this._fileViewModel.treeRoot(), function (tracepoint){
            if (tracepoint) {
              if (!this.swapTracePrompt(tracepoint)) {
                this.tracepoints.push(tracepoint);
              }
            } // else no data?
          }.bind(this));
        }.bind(this));
      }
    }
  };
}());
