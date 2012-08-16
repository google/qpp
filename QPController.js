// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

function protect(expr) {
    return "eval(" + expr + ")"; // unwrapped by QPController
}

function unprotect(str) {
    return str.replace(/:\"eval\(([^\)]*)\)\"/,":$1");
}

function IdentifierQuery(identifier) {
    this.identifier = identifier;
}

IdentifierQuery.prototype = {

  // A jsonable object inserted to create the tracepoint output
  tracepointMessage: function(traceLocationIndex) {
    return {
        tq: this.id,
        value: protect(this.identifier),  
        locationIndex: traceLocationIndex
    };
  },
  
  // augment the tracepoint output with additional (static) data
  tracepoint: function(tracepointData) {
      tracepointData.syntaxTreeType = this.traceLocations[tracepointData.locationIndex].type;
      tracepointData.tracequeryType = "Identifier";
      tracepointData.tracequery = this;
      return tracepointData;
  },
    
};

var QPController = {

    _tracequeries: {
        _tqs: [],
        
        by: function(field) {
            var tqByField = {};
            this._tqs.forEach(function(tq){
                if (field in tq)
                  tqByField[tq[field]] = tq;
            });
            return tqByField;
        },
        
        byIdentifier: function() {
            return this.by('identifier');
        },
        
        byId: function() {
            return this.by('id');
        },

        getTraceSource: function(previousLocation, currentLocation) {
          // todo sort tqs
          var previous = previousLocation ? previousLocation.start.offset : 0;
          var current = currentLocation.start.offset;
          var message;
          this._tqs.forEach(function(tq, tqIndex) {
            return tq.traceLocations.forEach(function(traceLocation, locationIndex) {
              var offset = traceLocation.location.start.offset;
              console.log(previous + " <= " + offset + " < " + current);
              if ( (previous <= offset) &&  (offset < current) ) {
                message = QPController.formatTraceMessage(tq.tracepointMessage(locationIndex));
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
        this._tracequeries.add(new IdentifierQuery(identifier));
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
        var tqById = this._tracequeries.byId();
        return __qp_tps.map(function (tp) {
            tq = tqById[tp.tq];
            console.log(tp);
            return tq.tracepoint(tp);
        });
    },
    
    initialize: function() {
      this._tracequeries.clear();
      __qp_tps = [];
    },
};
