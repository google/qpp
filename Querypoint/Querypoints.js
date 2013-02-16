// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  var __qp_tps;

  function protect(expr) {
      return "eval(" + expr + ")"; // unwrapped by Querypoints
  }

  function unprotect(str) {
      return str.replace(/:\"eval\(([^\)]*)\)\"/,":$1");
  }

  var getTreeNameForType = traceur.syntax.trees.getTreeNameForType;

  Querypoint.Querypoints = {

    tracequeries: [],
    
    byField: function(field) {
        var tqByField = {};
        this.tracequeries.forEach(function(tq){
            if (field in tq)
              tqByField[tq[field]] = tq;
        });
        return tqByField;
    },
    
    byIdentifier: function() {
        return this.byField('identifier');
    },
    
    byId: function() {
        return this.byField('id');
    },

    getTraceSource: function(previousLocation, currentLocation) {
      // todo sort tqs
      var previous = previousLocation ? previousLocation.start.offset : 0;
      var current = currentLocation.start.offset;
      var message;
      this.tracequeries.forEach(function(tq, tqIndex) {
        return tq.traceLocations.forEach(function(traceLocation, locationIndex) {
          var offset = traceLocation.start.offset;
          console.log(previous + " <= " + offset + " < " + current);
          if ( (previous <= offset) &&  (offset < current) ) {
            message = Querypoints.formatTraceMessage(tq.tracepointMessage(locationIndex));
            return true;
          } 
        });
      });
      return message;
    },

    clear: function() {
        this.tracequeries = [];
    },

    // Query Acccess

    possibleQueries: function() {
      return [Querypoint.ValueChangeQuery, Querypoint.AllExpressionsQuery];
    },

    // Query Actions
    
    setConsole: function(qpConsole) {
        this.qpConsole = qpConsole;
    },

    // Different deployments may need different ways to transport the tracepoint
    // result back to the querypoint storage. 
    
    // Each trace is passed
    // through this function before injecting in the syntax tree. 
    
    formatTraceMessage: function(traceJSONable) {
      var json = JSON.stringify(traceJSONable);
      // expressions we want to evaluate at the tracepoint are escaped by wrapping 'eval()' around them.
      // convert these back. 
      return "__qp_tps.push(" + unprotect(json) + ");";
    },
    
    // The stream of tracepoint results 
    
    tracepoints: function() {
        var tqById = this.byId();
        return __qp_tps.map(function (tp) {
            tq = tqById[tp.tq];
            console.log(tp);
            return tq.tracepoint(tp);
        });
    },
    
    // The querypoint results
    querypoints: function() {
        console.log("TODO: analyze the tracepoints");
    },
    
    initialize: function() {
      this.clear();
      __qp_tps = [];
      return this;
    },
  };

}());
