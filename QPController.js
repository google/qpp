// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPController = {
    // Query Definitions

    traceObjectCreation: function(identifier) {
        this._objectCreationIdentifiers.push(identifier);
    },

    setConsole: function(qpConsole) {
        this.qpConsole = qpConsole;
    },

    // Query Actions
    
    rerun: function() {

    },
    
    initialize: function() {
        this._objectCreationIdentifiers = [];
    },
};
