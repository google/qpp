// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  "use strict";

  QuerypointPanel.TokenQueryProvider = function(tokenViewModel, project) {
    this.tokenViewModel = tokenViewModel;
        
    this.queries = ko.computed(function() {
      var tree = this.tokenViewModel.tokenTree();
      var queries = [];
      if (tree) {
        project.querypoints.possibleQueries().forEach(function(possibleQuery) {
          var query = possibleQuery.ifAvailableFor(tree, project);
          if (query) {
            queries.push(query);
          }
        });
      }
      return queries;
    }.bind(this)).extend({ throttle: 1 });
    
  }
  
}());
