// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  window.QuerypointPanel = window.QuerypointPanel || {};
  
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
        load: '_',
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
      this.query.setQueryOnTree(this.query.tree, this.query);
      
      this.query.activate();

      // project -> query
      this.panel.tracequeries.push(this.query);
    },
  };

  QuerypointPanel.QueriesViewModel = function(fileViewModel, panel) {
    this.fileViewModel = fileViewModel;
    this.tokenViewModel = fileViewModel.tokenViewModel;
    this._panel = panel;
        
    this.currentQueries = ko.computed(function() {
      var tree = this.tokenViewModel.tokenTree();
      var queries = [];
      if (tree) {
        var project = this._panel.project;
        project.querypoints.possibleQueries().forEach(function(possibleQuery) {
          var query = possibleQuery.ifAvailableFor(tree, project);
          if (query) {
            queries.push(new QuerypointPanel.QueryViewModel(query, panel));
          }
        });
      }
      return queries;
    }.bind(this)).extend({ throttle: 1 });
    
    this.hasQueries = ko.computed(function() {
      return (this.currentQueries().length > 0)
    }.bind(this));
  }
  
  
}());
