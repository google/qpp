// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  "use strict";
  
  QuerypointPanel.TracesViewModel = function(querypointViewModel, loadListViewModel, tracequeries) {
    this._querypointViewModel = querypointViewModel;


    this.rootTreeData = ko.computed(function(){
      var treeRoot = querypointViewModel.treeRoot();
      var traceData = treeRoot && treeRoot.traceData();
      if (traceData) {
        // TODO we should only visit the tree in view, not the entire tree
        var treeHanger = this._treeHanger(querypointViewModel.project);
        treeHanger.visitTrace(querypointViewModel.treeRoot(), traceData);
      }
      return traceData;
    }.bind(this)).extend({ throttle: 1 });

    this.currentTreeTrace = ko.computed(function(){
      var currentTree =  querypointViewModel.tokenViewModel.tokenTree();
      if (currentTree) {
        var rootTreeData = this.rootTreeData();
        if (rootTreeData) {
          return currentTree.location.traces || [];
        }
      }
      return [];
    }.bind(this));
    
    this.treeTraces = ko.computed(function() {
         var tracepoints;
         if (loadListViewModel.showLoad().loadNumber !== loadListViewModel.loadStartedNumber()){
             if (!('tracepoints' in loadListViewModel.showLoad())) return [];
             tracepoints = loadListViewModel.showLoad().tracepoints();
         } else {
             tracepoints = this._querypointViewModel.tracepoints();
         }
         var tree = querypointViewModel.tokenViewModel.tokenTree();
         if (tree) {
          
          var treeTracepoints = [];
          tracepoints.reduce(function(treeTracepoints, tracepoint) {
              if (tracepoint.query.targetTree() === tree) treeTracepoints.push(tracepoint);
              return treeTracepoints;
          }, treeTracepoints);  
          
          var traces = this.currentTreeTrace();
          traces = traces.concat(treeTracepoints);
          
          var prompts = [];
          tracequeries().reduce(function(prompts, query) {
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

    function traceBodySpace(){
        var hoverDoorTarget = document.querySelector('.hoverDoorTarget');
        var tokenView = 110; // size depends on selected token
        var explainTokenPanel = document.querySelector('.explainTokenPanel');
        var queryView = document.querySelector('.queryView');
        return hoverDoorTarget.offsetHeight - tokenView - explainTokenPanel.offsetHeight - queryView.offsetHeight;
    }

    window.onresize = function(){
      this.afterRender();
      loadListViewModel.showLoad.valueHasMutated();
    }.bind(this);

    this.afterRender = function() {
      // Set max height of trace table depend on window height
      var traceBody = document.querySelector('.traceBody');
      if (!this.maxSizeSet) {
        traceBody.style.maxHeight = traceBodySpace() + 'px';
        this.maxSizeSet = true;  
      }
      traceBody.scrollTop = 9999;
    }

    // Query results for the current token in this file.
    this.currentTraces = ko.computed(function() {
        var tree = querypointViewModel.tokenViewModel.tokenTree();

        if (tree && tracequeries().length) {
          var traces = this.treeTraces();
          if (traces && traces.length) {
            var traceViewModels = traces.map(function(trace) {
              return new QuerypointPanel.TraceViewModel(trace, querypointViewModel.project);
            });
            this.currentLocation(tree.location);
            return traceViewModels;
          }  
        }
      }.bind(this)).extend({ throttle: 100 });
  }
  
  QuerypointPanel.TracesViewModel.prototype = {
          
    _treeHanger: function(project) {
      if (!this._treeHangerTraceVisitor) {
        this._treeHangerTraceVisitor = project.treeHangerTraceVisitor();  
      } 
      return this._treeHangerTraceVisitor;
    },


  };
}());
