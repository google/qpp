// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Backing data for QuerypointModel Panel, save/restore object

(function() {

  'use strict';

  /**
   @param string url, no search or hash part
   */
  var PanelModel = QuerypointModel.PanelModel = function (url){
    this.record = new PanelModel.Record();
    this.record.sites[0] = PanelModel.Site(url);
    this.scrubber = {
      selectedSite: 0,        // index into record.sites
      selectedReload: 0,    // index into record.sites[selectedSite]
      selectedMessage: 0, // index into record.sites[selectedSite].reloads[selectedReload]
    }
    this.buffers = {
      openURLs: [url],       // By default we open the html 
      unsavedBuffers: [],
      userOpenedBuffer: 0 
    }
  }; 

  PanelModel.Record = function() {
    this.sites = []; // ordered by time
  }

  PanelModel.Site = function(url) {
    this.url = url;
    this.reloads = [];
  }

  PanelModel.Reload = function() {
    messages: []
  }

}());