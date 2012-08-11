// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPController = {
    
    // Query Definitions

    traceObjectCreation: function(identifier) {
        this._objectCreationIdentifiers[identifier] = [];
    },

    setConsole: function(qpConsole) {
        this.qpConsole = qpConsole;
    },

    // Query Actions
    
    transformer: function() {
        return new traceur.outputgeneration.QPTransformer(this._objectCreationIdentifiers);
    },
    
    tracingSource: function() {
       
        
        __qp__("IdentifierTrace", "b", "ObjectLiteral", "foo.js:4:1");
    },
    
    initialize: function() {
        this._objectCreationIdentifiers = {};
    },
};
