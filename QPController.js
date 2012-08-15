// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

function tracepointCallback(qp, traceLocationIndex) {
    var src = "";
    src += 'console.log({"qp": ';
    src += qp.id
    src += ', "value": ';
    src += qp.identifier;
    src += ', "locationIndex": ';
    src += traceLocationIndex;
    src += '});';
    return src;
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
        
        between: function(previousLocation, currentLocation) {
          // todo sort qps
          var previous = previousLocation ? previousLocation.start.offset : 0;
          var current = currentLocation.start.offset;
          var aQPBetween;
          this._qps.some(function(qp, qpIndex) {
            return qp.traceLocations.some(function(traceLocation, locationIndex) {
              var offset = traceLocation.location.start.offset;
                console.log(previous + "<= " + offset + " < " + current);
              if ( (previous <= offset) &&  (offset < current) ) {
                aQPBetween = tracepointCallback(qp, locationIndex);
                return true;
              } 
            });
          });
          return aQPBetween;
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

    tracingSource: function() {
       
        
        __qp__("IdentifierTrace", "b", "ObjectLiteral", "foo.js:4:1");
    },
    
    initialize: function() {
      this._querypoints.clear();
    },
};
