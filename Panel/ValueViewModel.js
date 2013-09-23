// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// One item of trace data

(function() {
  "use strict";
  
  var debug = DebugLogger.register('ValueViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.ValueViewModel = function() {
    
  }
  
  QuerypointPanel.ValueViewModel.prototype = {
    inlineView: function(value, valueType) {
      var result = this['inline_' + valueType](value);
      if (debug) console.log('ValueViewModel ' + value + " type " + valueType + ' = ' + result);
      return result;
    },
    inline_string: function(value) {
      return '\'' + value + '\'';
    },
    inline_undefined: function(value) {
      return 'undefined';
    },
    inline_number: function(value) {
      return value;
    },
    inline_boolean: function(value) {
      return value ? 'true' : 'false';
    },
    inline_object: function(value) {
      if (!value)
        return 'null';
      return '{' + value + '}';
    },
    inline_function: function(value) {
      return '()';
    },
    inline_xml: function(value) {
      return 'xml';
    }
  };

}());
