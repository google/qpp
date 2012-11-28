// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  var bindings = 0;
  
  QuerypointPanel.QueryViewModel = function(fileViewModel, panel) {
    this.fileViewModel = fileViewModel;
    this.tokenViewModel = fileViewModel.tokenViewModel;
    this._panel = panel;
    
    this.isTracing = ko.observable(false);
        
    this.currentQueries = ko.computed(function() {
      var tree = this.tokenViewModel.tokenTree();
      var queries = [];
      if (tree) {
        var project = this._panel.project;
        project.querypoints.possibleQueries().forEach(function(possibleQuery) {
          var query = possibleQuery.ifAvailableFor(tree);
          if (query) {
            queries.push(query);
          }
        });
      }
      return queries;
    }.bind(this));
    
    this.hasQueries = ko.computed(function() {
      return (this.currentQueries().length > 0)
    }.bind(this));
    
    //ko.applyBindings(this, document.querySelector('.queryView'));
    console.log("bindings: "+ (++bindings));
  }
  
  QuerypointPanel.QueryViewModel.prototype = {

    attachTracePrompt: function(tree, tracer) {
      var trace = {
        load: '_',
        turn: '_',
        activation: '_',
        value: tracer.tracePrompt(),
        tracer: tracer,
      };

      var traces = tree.location.traces = tree.location.traces || [];
      
      traces.push(trace);
    },

    issueQuery: function(tracer) {
      this.attachTracePrompt(this.fileViewModel.tokenViewModel.tokenTree(), tracer);
      this._panel.tracequeries.push(tracer);
      var executer = this._panel.project.executer;
      if (executer) {
        if (executer.automatic) {
          executer();
        } else {
          this.offerExecution(executer);
        }
      } else {
        this.requestExecution(executer);
      }
    },
    requestExecution: function() {

      this.isTracing(true);
    },
    reproductionDone: function() {

      this.isTracing(false);
    }
  };
}());
