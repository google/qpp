// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

function protect(expr) {
    return "eval(" + expr + ")"; // unwrapped by QPController
}

function unprotect(str) {
    return str.replace(/:\"eval\(([^\)]*)\)\"/,":$1");
}

function tracepointMessage(tq, traceLocationIndex) {
    return {
        tq: tq.id,
        value: protect(tq.identifier),  
        locationIndex: traceLocationIndex
    };
}

var QPController = {

    _tracequeries: {
        _tqs: [],

        byIdentifier: function() {
            var tqById = {};
            this._tqs.forEach(function(tq){
                if (tq.identifier)
                  tqById[tq.identifier] = tq;
            });
            return tqById;
        },
        
        getTraceSource: function(previousLocation, currentLocation) {
          // todo sort tqs
          var previous = previousLocation ? previousLocation.start.offset : 0;
          var current = currentLocation.start.offset;
          var message;
          this._tqs.some(function(tq, tqIndex) {
            return tq.traceLocations.some(function(traceLocation, locationIndex) {
              var offset = traceLocation.location.start.offset;
                console.log(previous + "<= " + offset + " < " + current);
              if ( (previous <= offset) &&  (offset < current) ) {
                message = QPController.formatTraceMessage(tracepointMessage(tq, locationIndex));
                return true;
              } 
            });
          });
          return message;
        },

        add: function(tq) {
            tq.traceLocations = [];
            tq.tracepoints = [];
            tq.id = this._tqs.length;
            this._tqs.push(tq);
        },

        clear: function() {
            this._tqs = [];
        }
    },

    // Query Definitions

    traceObjectCreation: function(identifier) {
        this._tracequeries.add({identifier: identifier});
    },

    // Query Acccess

    tracequeries: function() {
        return this._tracequeries;
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
      this._tracequeries.clear();
    },
};
