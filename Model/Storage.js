// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Backing data for QuerypointModel Panel, save/restore object


(function() {
 
  'use strict';
  
  var Storage = QuerypointModel.Storage = function Storage() {
    this.key = "QuerypointModel.PanelModel";
  }

  /**
    @param QuerypointModel.PanelModel model
    @param function onSuccess
    @param function onError
  */
  Storage.store = function(model, onSuccess, onError) {
    localStorage.setItem(this.key, model);
    onSuccess(model);
  }

  Storage.recall = function(onSuccess, onError) {
    var model = localStorage.getItem(this.key);
    console.log("Storage.recall "+this.key,model); 
    model ? onSuccess(model) : onError();
  } 

}());