// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  var bindings = 0;
  
  QuerypointPanel.QueryViewModel = function(fileViewModel, project) {
    this.fileViewModel = fileViewModel;
    this.tokenViewModel = fileViewModel.tokenViewModel;
    this._project = project;
    this.update = fileViewModel.update.bind(fileViewModel);
    
    this.isTracing = ko.observable(false);
        
    this.currentQueries = ko.computed(function() {
      var tree = this.tokenViewModel.tokenTree();
      var queries = [];
      if (tree) {
        var project = this._project;
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

    issueQuery: function(tracer) {
      this.fileViewModel.project.querypoints.appendQuery(tracer);
      var executer = this.fileViewModel.project.executer;
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
      this._project.reload();
      this.isTracing(true);
    },
    reproductionDone: function() {
      this.update();
      this.isTracing(false);
    }
  };
}());
