// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Backing data for QuerypointModel Panel, save/restore object


(function() {
 
  'use strict';

  var debug = DebugLogger.register('Storage', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  var Storage = QuerypointModel.Storage = function Storage() {
    this.key = "QuerypointModel.PanelModel";
  }

  /**
    @param QuerypointModel.PanelModel model
    @param function onSuccess
    @param function onError
  */
  Storage.store = function(model, onSuccess, onError) {
    var JSONized = JSON.stringify(model);
    localStorage.setItem(this.key, JSONized);
    if (onSuccess)
      onSuccess(model);
  }

  Storage.recall = function(onSuccess, onError) {
    var model;
    try {
      var modelJSON = localStorage.getItem(this.key);
      if (modelJSON !== 'undefined') // string created by storing undefined.
          model = JSON.parse(modelJSON || '');
      if (debug) console.log('Storage.recall ' + this.key,model);   
      model ? onSuccess(model) : onError('No model from ' + modelJSON);
    } catch(exc) {
      onError(exc);
    }
  } 

}());