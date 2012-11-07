// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.QueryViewModel = function(tokenViewModel, project, fileViewModel) {
    this._tokenViewModel = tokenViewModel;
    this._project = project;
    this.update = fileViewModel.update.bind(fileViewModel);
    
    this._reproducing = ko.observable(false);
    ko.applyBindings(this, document.querySelector('.queryView'));
  }
  
  QuerypointPanel.QueryViewModel.prototype = {
    lastChange: function(viewModel) {
      var tree = viewModel._tokenViewModel.currentTree();
      console.log("lastChange ", tree);
      var executer = viewModel._project.querypoints.traceObjectProperty(tree);
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
      this._reproducing(true);
    },
    reproductionDone: function() {
      this.update();
      this._reproducing(false);
    }
  };
}());
