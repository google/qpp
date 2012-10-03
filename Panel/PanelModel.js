// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Backing data for Querypoint Panel, save/restore object

window.Querypoint = window.Querypoint || {};

( function() {
  var PanelModel = Querypoint.PanelModel = function (){
    this.record = new PanelModel.Record();
    this.openEditors = [];
  }; 

  PanelModel.Record = function() {
    this.sites = []; // ordered by time
  }

  PanelModel.Site = function(url) {
    this.url = url;
    this.reloads = [];
  }

}());