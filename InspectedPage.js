// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// Model of the debuggee based on chrome.devtools callback data

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
    console.log("onNavigated "+url);
  },

  monitorResources: function() {
    chrome.devtools.inspectedWindow.onResourceAdded.addListener(this.addResource.bind(this));
    chrome.devtools.inspectedWindow.getResources(function onResources(resources){
      console.log("getResources", resources.map(function(resource){return resource.url}));
      resources.forEach(this.addResource.bind(this));
    }.bind(this));
  },

  addResource: function(resource) {
    console.log("addResource " + resource.url + ' to ' + this.resources.length + " resources");
    this.resources.push(resource);
  },

  monitorNetwork: function() {
    this.refreshHAR();
    chrome.devtools.network.onRequestFinished.addListener(function onRequestFinished(harEntry){
      console.log("onRequestFinished", harEntry);
    }.bind(this));
  },

  refreshHAR: function() {
    chrome.devtools.network.getHAR(function onHAR(harLog) {
      console.log("onHAR", harLog);
    }.bind(this));
  }
};