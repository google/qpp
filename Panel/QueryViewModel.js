// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  
  "use strict";

  var bindings = 0;
  
  QuerypointPanel.QueryViewModel = function(query, panel) {
    this.query = query;
    this.panel = panel;

    this.isActive = ko.computed(function() {
      var recorded = (this.panel.tracequeries.indexOf(this.query) !== -1);
      return recorded;
    }.bind(this));

    this.buttonName = query.buttonName.bind(query);
    this.toolTip = query.toolTip.bind(query);
  }

  QuerypointPanel.QueryViewModel.prototype = {
    tracePrompt: function() {
      var emptyTrace = {
        loadNumber: '_',
        turn: '_',
        activation: '_',
        value: this.query.tracePromptText(),
        query: this.query,
        isPrompt: true,
      };
      return emptyTrace;
    },

    activateQuery: function(fileViewModel) {
      if (this.isActive()) return;
      
      // tree -> query
      this.query.setQueryOnTree(this.query.targetTree(), this.query);
      
      this.query.activate(this.panel.tracequeries().length);

      // project -> query
      this.panel.tracequeries.push(this.query);
      this.panel.resetChain(fileViewModel);
    },
  };

  QuerypointPanel.QueriesViewModel = function(queryProvider, panel) {
    this._panel = panel;
        
    this.queryViewModels = ko.computed(function() {
      var queries = [];
      queryProvider.queries().forEach(function(query) {
        queries.push(new QuerypointPanel.QueryViewModel(query, panel));
      });
      return queries;
    }.bind(this)).extend({ throttle: 1 });
    
    this.hasQueries = ko.computed(function() {
      return (this.queryViewModels().length > 0)
    }.bind(this));
  }
  
}());
