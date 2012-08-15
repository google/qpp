// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com



var QPController = {

    _querypoints: {
        _qps: [],

        byIdentifier: function() {
            var qpById = {};
            this._qps.forEach(function(qp){
                if (qp.identifier)
                  qpById[qp.identifier] = qp;
            });
            return qpById;
        },
        
        match: function(location) {
          return this._qps.some(function(qp) {
            var i = qp.traceLocations.indexOf(location);
            if (i !== -1) return qp
          });
        },

        add: function(qp) {
            qp.traceLocations = [];
            qp.tracepoints = [];
            this._qps.push(qp);
        },

        clear: function() {
            this._qps = [];
        }
    },

    // Query Definitions

    traceObjectCreation: function(identifier) {
        this._querypoints.add({identifier: identifier});
    },

    // Query Acccess

    querypoints: function() {
        return this._querypoints;
    },

    // Query Actions
    
    setConsole: function(qpConsole) {
        this.qpConsole = qpConsole;
    },

    tracingSource: function() {
       
        
        __qp__("IdentifierTrace", "b", "ObjectLiteral", "foo.js:4:1");
    },
    
    initialize: function() {
      this._querypoints.clear();
    },
};
