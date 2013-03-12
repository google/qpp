// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// Model of the debuggee based on chrome.devtools callback data

(function(){
  'use strict';

  var debug = DebugLogger.register('InspectedPage', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })

  function InspectedPage() {
    chrome.devtools.network.onNavigated.addListener(this.onNavigated.bind(this));
    this.onNavigated();
    this.monitorResources();
    this.monitorNetwork();
  }

  InspectedPage.prototype = {

    onNavigated: function(url) {
      this.resources = []; // API, Array<chrome.devtools.inspectedWindow.Resource>
      this.url = url;
      if (url) {
        if (debug) console.log("onNavigated " + url + '----------------------------');
      }
    },

    monitorResources: function() {
      chrome.devtools.inspectedWindow.onResourceAdded.addListener(this.addResource.bind(this));
      chrome.devtools.inspectedWindow.getResources(function onResources(resources){
        if (debug) console.log("getResources", resources.map(function(resource){return resource.url}));
        resources.forEach(this.addResource.bind(this));
      }.bind(this));
    },

    addResource: function(resource) {
      if (!resource.url)  // I guess these are console evaluations for example. 
        return; 
      if (debug) console.log("addResource " + resource.url + ' to ' + this.resources.length + " resources");
      this.resources.push(resource);
    },

    monitorNetwork: function() {
      this.refreshHAR();
      chrome.devtools.network.onRequestFinished.addListener(function onRequestFinished(harEntry){
        if (debug) console.log("onRequestFinished", harEntry);
      }.bind(this));
    },

    refreshHAR: function() {
      chrome.devtools.network.getHAR(function onHAR(harLog) {
        if (debug) console.log("onHAR", harLog);
      }.bind(this));
    }
  };

  Querypoint.InspectedPage = InspectedPage;
}());