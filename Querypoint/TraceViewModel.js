 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
    window.Querypoint = window.Querypoint || {};
    
    Querypoint.TraceViewModel = function(root) {
        this.traces = ko.observableArray([{turn: '',activation: '',value: ''}]);
        ko.applyBindings(this, document.querySelector('.QPOutput'));
    }
    
    Querypoint.TraceViewModel.prototype = {
        setModel: function(tree) {
            this.traces.removeAll();
            tree.location.trace.forEach(function(trace) {
                this.traces.push(trace);
            }.bind(this));
        
        }
    };
}());
