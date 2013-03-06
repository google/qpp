// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  "use strict";

  QuerypointPanel.ElementQueryProvider = function(project) {
    this._project = project;
      
    // If we later want to allow queries on elements selected from UI, 
    // this object will depend on a source of current element selected.
    this.selector = ko.observable();
    this.functionURL = ko.observable();
        
    this.queries = ko.computed(function() {
      var selector = this.selector();
      var functionURL = this.functionURL();
      return this.getQueriesBySelector(selector, functionURL);
    }.bind(this)).extend({ throttle: 1 });
    
  }

  QuerypointPanel.ElementQueryProvider.prototype = {
    getQueriesBySelector: function(selector, functionURL) {
      if (!selector) 
        return [];
        
      var provider = this;  
      var query;
      provider._project.elementQueries.some(function(queryClass) {
        query = provider._project.getMatchingQuery(queryClass, {selector: selector, functionURL: functionURL});
        return query;
      });  
      if (query)
        return [query];
              
      var queries = provider._project.elementQueries.reduce(function(queries, queryClass) {          
          var query = queryClass.ifAvailableFor(provider._project, selector, functionURL);
          if (query)
            queries.push(query);  
          return queries;
        }, []);
      return queries;      
    }
  };
  
}());
