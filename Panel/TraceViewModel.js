
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TraceViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;
    this._panel = panel;

    this.rootTreeData = ko.computed(function(){
      var traceData = fileViewModel.traceData();
      if (traceData) {
        // TODO we should only visit the tree in view, not the entire tree
        var treeHanger = this._treeHanger(fileViewModel.project, fileViewModel.treeRoot());
        treeHanger.visitTrace(fileViewModel.treeRoot(), traceData);
      }
      return traceData;
    }.bind(this));
    
    this.treeTraces = ko.computed(function() {
      if (this.rootTreeData()) {
         var tree = fileViewModel.tokenViewModel.tokenTree();
         if (tree) {
          var traces = tree.location.traces;
          var prompts = tree.location.prompts;  // TODO ko prompts
          
          if (!traces) {
            traces = prompts;
          } else {
            if (prompts) {
              traces.forEach(function(trace, traceIndex) {
                if (trace.isPrompt) {
                  prompts.forEach(function(prompt, promptIndex) {
                    if (prompt.query === trace.query) {
                      prompts.splice(promptIndex, 1); // we've executed and completed one trace
                    } else {
                      traces.push(prompt);
                    }
                  });
                }
              });
            }
          }
          return traces;
         }
      } 
    }.bind(this));

    // Query results for the current token in this file.
    this.currentTraces = ko.computed(function() {
        var tree = fileViewModel.tokenViewModel.tokenTree();

        if (tree && panel.tracequeries().length) {
          var traces = this.treeTraces();
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
  }
  
  QuerypointPanel.TraceViewModel.prototype = {
          
    _treeHanger: function(project, rootTree) {
      if (!this._treeHangerTraceVisitor) {
        this._treeHangerTraceVisitor = project.treeHangerTraceVisitor(rootTree);  
      } 
      return this._treeHangerTraceVisitor;
    },


  };
}());
