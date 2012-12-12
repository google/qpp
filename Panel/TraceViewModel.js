
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
          var prompts = tree.location.prompts;
          
          if (!traces) {
            traces = prompts;
          } else {
            if (prompts) {
              traces = traces.concat(prompts);
            }
          }
          
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
    
    checkTracePrompts: function(tree) {
      var traces = tree.location.traces;
      if (!traces) {
        return;
      }
      var prompts = tree.location.prompts;
      if (!prompts) {
        return;
      }

      prompts.forEach(function(prompt, promptIndex) {
        var drop = -1;
        traces.forEach(function(trace, index) {
          if (trace.query == prompt.query) {
            drop = promptIndex;
          }
        });
        if (drop !== -1) {
          tree.location.prompts.splice(promptIndex, 1); 
        }
      });
    },
    
    update: function(traceData) {
      var treeRoot = this._fileViewModel.treeRoot();
      if (treeRoot) {
        var treeHanger = this.treeHanger(this._fileViewModel.project, treeRoot);
        var tree = this._fileViewModel.tokenViewModel.tokenTree();
        // TODO we should only visit the tree in view, not the entire tree
        treeHanger.visitTrace(treeRoot, traceData);
        this._panel.tracequeries().forEach(function(tq){
          tq.extractTracepoints(this._fileViewModel.treeRoot(), function (tracepoint){
            if (tracepoint) {
              this.tracepoints.push(tracepoint);
            } // else no data?
          }.bind(this));
        }.bind(this));
        this.checkTracePrompts(tree);
      }
    }
  };
}());
