
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  "use strict";
  
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

    this.currentTreeTrace = ko.computed(function(){
      var currentTree =  fileViewModel.tokenViewModel.tokenTree();
      if (currentTree) {
        var rootTreeData = this.rootTreeData();
        if (rootTreeData) {
          return currentTree.location.traces || [];
        }
      }
      return [];
    }.bind(this));
    
    this.treeTraces = ko.computed(function() {
         var tree = fileViewModel.tokenViewModel.tokenTree();
         if (tree) {
          
          var treeTracepoints = [];
          this._fileViewModel.tracepoints().reduce(function(treeTracepoints, tracepoint) {
              if (tracepoint.query.targetTree() === tree) treeTracepoints.push(tracepoint);
              return treeTracepoints;
          }, treeTracepoints);  
          
          var traces = this.currentTreeTrace();
          traces = traces.concat(treeTracepoints);
          
          var prompts = [];
          this._panel.tracequeries().reduce(function(prompts, query) {
              if (query.targetTree() === tree) prompts.push(query.tracePrompt());
              return prompts;
          }, prompts);
          
          if (!traces.length) {
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

    this.currentLocation = ko.observable(); // used to ensure that the UI is in sync during testing

    // Query results for the current token in this file.
    this.currentTraces = ko.computed(function() {
        var tree = fileViewModel.tokenViewModel.tokenTree();

        if (tree && panel.tracequeries().length) {
          var traces = this.treeTraces();
          if (traces && traces.length) {
            var traceViewModels = traces.map(function(trace) {
              var traceViewModel = {};
              Object.keys(trace).forEach(function(prop) {
                traceViewModel[prop] = trace[prop];
              });
              traceViewModel.tooltip = trace.query.title() + " found in " + trace.file;
              traceViewModel.url = fileViewModel.project.createFileURL(trace.file, trace.startOffset, trace.endOffset);
              traceViewModel.iconText = trace.query.iconText();
              return traceViewModel;
            });
            this.currentLocation(tree.location);
            return traceViewModels;
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
