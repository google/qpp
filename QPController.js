// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

function protect(expr) {
    return "eval(" + expr + ")"; // unwrapped by QPController
}

function unprotect(str) {
    return str.replace(/:\"eval\(([^\)]*)\)\"/,":$1");
}

function tracepointMessage(qp, traceLocationIndex) {
    return {
        qp: qp.id,
        value: protect(qp.identifier),  
        locationIndex: traceLocationIndex
    };
}

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
        
        getTraceSource: function(previousLocation, currentLocation) {
          // todo sort qps
          var previous = previousLocation ? previousLocation.start.offset : 0;
          var current = currentLocation.start.offset;
          var message;
          this._qps.some(function(qp, qpIndex) {
            return qp.traceLocations.some(function(traceLocation, locationIndex) {
              var offset = traceLocation.location.start.offset;
                console.log(previous + "<= " + offset + " < " + current);
              if ( (previous <= offset) &&  (offset < current) ) {
                message = QPController.formatTraceMessage(tracepointMessage(qp, locationIndex));
                return true;
              } 
            });
          });
          return message;
        },

        add: function(qp) {
            qp.traceLocations = [];
            qp.tracepoints = [];
            qp.id = this._qps.length;
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

    // Different deployments may need different ways to transport the tracepoint
    // result back to the querypoint storage. 
    formatTraceMessage: function(traceJSONable) {
      var json = JSON.stringify(traceJSONable);
      // expressions we want to evaluate at the tracepoint are escaped by wrapping 'eval()' around them.
      // convert these back. 
      return "console.log(" + unprotect(json) + ");";
    },
    
    initialize: function() {
      this._querypoints.clear();
    },
};
