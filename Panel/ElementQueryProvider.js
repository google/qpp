// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  "use strict";

  QuerypointPanel.ElementQueryProvider = function(project) {
    // If we later want to allow queries on elements selected from UI, 
    // this object will depend on a source of current element selected.
    this.selector = ko.observable();
        
    this.queries = ko.computed(function() {
      var selector = this.selector();
      var queries = project.elementQueries.reduce(function(queries, queryClass) {
        var query = queryClass.ifAvailableFor(selector, project);
        if (query)
            queries.push(query);
        return queries;
      }, []);
      return queries;
    }.bind(this)).extend({ throttle: 1 });
    
  }
  
}());
