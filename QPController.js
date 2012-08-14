// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPController = {
    // Query Model Plain old data
    model: {},

    // Query Definitions

    traceObjectCreation: function(identifier) {
        model.objectCreationIdentifiers[identifier] = [];
    },

    setConsole: function(qpConsole) {
        this.qpConsole = qpConsole;
    },

    // Query Actions
    
    tracingSource: function() {
       
        
        __qp__("IdentifierTrace", "b", "ObjectLiteral", "foo.js:4:1");
    },
    
    initialize: function() {
      model = {
        objectCreationIdentifiers: {},
      };
    },
};
