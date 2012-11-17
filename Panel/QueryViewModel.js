// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  var bindings = 0;
  
  QuerypointPanel.QueryViewModel = function(tokenViewModel, project, fileViewModel) {
    this._tokenViewModel = tokenViewModel;
    this._project = project;
    this.update = fileViewModel.update.bind(fileViewModel);
    
    this._reproducing = ko.observable(false);
    
    this.possibleQueries = [project.querypoints.ValueChangeQuery];
    
    this.currentQueries = ko.computed(function() {
      var tree = this._tokenViewModel.currentTree();
      var queries = [];
      if (tree) {
        var project = this._project;
        this.possibleQueries.forEach(function(possibleQuery) {
          var query = possibleQuery.ifAvailableFor(tree);
          if (query) {
            query.project = project; 
            queries.push(query);
          }
        });
      }
      return queries;
    }.bind(this));
    
    this.hasQueries = ko.computed(function() {
      return (this.currentQueries().length > 0)
    }.bind(this));
    
    ko.applyBindings(this, document.querySelector('.queryView'));
    console.log("bindings: "+ (++bindings));
  }
  
  QuerypointPanel.QueryViewModel.prototype = {

    issueQuery: function(query, event) {
      query.activate();
      query.project.querypoints.appendQuery(query);
      var executer = query.project.executer;
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
      this._reproducing(true);
    },
    reproductionDone: function() {
      this.update();
      this._reproducing(false);
    }
  };
}());
