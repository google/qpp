
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.TraceViewModel = function(fileViewModel, panel) {
    this._fileViewModel = fileViewModel;
    this._panel = panel;

    this.rootTreeData = ko.computed(function(){
      var treeRoot = fileViewModel.treeRoot();
      var traceData = treeRoot && treeRoot.traceData();
      if (traceData) {
        // TODO we should only visit the tree in view, not the entire tree
        var treeHanger = this._treeHanger(fileViewModel.project);
        treeHanger.visitTrace(fileViewModel.treeRoot(), traceData);
      }
      return traceData;
    }.bind(this)).extend({ throttle: 1 });
    
    this.treeTraces = ko.computed(function() {
         var tree = fileViewModel.tokenViewModel.tokenTree();
         if (tree) {
          
          var treeTracepoints = [];
          this._fileViewModel.tracepoints().reduce(function(treeTracepoints, tracepoint) {
              if (tracepoint.query.tree === tree) treeTracepoints.push(tracepoint);
              return treeTracepoints;
          }, treeTracepoints);  
          
          var traces = tree.location.traces || [];
          traces = traces.concat(treeTracepoints);
          
          var prompts = [];
          this._panel.tracequeries().reduce(function(prompts, query) {
              if (query.tree === tree) prompts.push(query.tracePrompt());
              return prompts;
          }, prompts);
          
          if (!traces) {
            traces = prompts;
          } else {
            if (prompts.length) {
              // Cull any prompts for querys that have completed once
              traces.forEach(function(trace, traceIndex) {
                  prompts.forEach(function(prompt, promptIndex) {
                    if (prompt.query === trace.query) {
                      prompts.splice(promptIndex, 1);
                    }
                  });
              });
              traces = traces.concat(prompts);
            }
          }
          return traces;
         }
    }.bind(this)).extend({ throttle: 1 });

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
              traceViewModel.tooltip = start.source.name + ' Line: ' + (start.line + 1);
              traceViewModel.url = panel.urlFromTreeLocation(tree.location);
              traceViewModel.startOffset = start.offset;
              traceViewModel.endOffset = end.offset;
              traceViewModel.commandName = trace.query.commandName();
              return traceViewModel;
            });
          } 
        }
      }.bind(this)).extend({ throttle: 1 });
  }
  
  QuerypointPanel.TraceViewModel.prototype = {
          
    _treeHanger: function(project) {
      if (!this._treeHangerTraceVisitor) {
        this._treeHangerTraceVisitor = project.treeHangerTraceVisitor();  
      } 
      return this._treeHangerTraceVisitor;
    },


  };
}());
