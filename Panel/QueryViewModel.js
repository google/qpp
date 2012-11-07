// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
  QuerypointPanel.QueryViewModel = function(tokenViewModel, project) {
    this._tokenViewModel = tokenViewModel;
    this._project = project;
    ko.applyBindings(this, document.querySelector('.queryView'));
  }
  
  QuerypointPanel.QueryViewModel.prototype = {
    lastChange: function(viewModel) {
      var tree = viewModel._tokenViewModel.currentTree();
      console.log("lastChange ", tree)
      viewModel._project.querypoints.traceObjectProperty(tree); 
    }
  };
}());
