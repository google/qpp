// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// Add this to the manifest.json:
// "background": {
//      "scripts": ["ChannelPlate/ChannelPlate.js", "ChannelPlate/ChannelPlateBackground.js"] // workaround CSP
//    },

function ChannelPlateBackground(rawPort) {
  ChannelPlate.ChromeBackground.call(this, rawPort);
}

var debug = false;

ChannelPlateBackground.prototype = Object.create(ChannelPlate.ChromeBackground.prototype);

// Cross site XHR, xhr(url) -> content 
//
ChannelPlateBackground.prototype.request = function(method, url, callback, errback) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, url);
  xhr.addEventListener('load', function(e) {
    if (xhr.status == 200 || xhr.status == 0) {
      if (debug) 
        console.log("end xhr "+url);
      
      callback(xhr.responseText);
    } else {
      if (debug) 
        console.error("err xhr "+url);

      errback(xhr.status);
    }
  }.bind(this), false);
  var onFailure = function() {
    errback.apply(null, arguments);
  }.bind(this);
  xhr.addEventListener('error', onFailure, false);
  xhr.addEventListener('abort', onFailure, false);
  xhr.send();
};


// Cross site XHR, xhr(url) -> content 
//
ChannelPlateBackground.prototype.xhr = function(url, callback, errback) {
  if (debug)
    console.log("start xhr "+url);
  this.request('GET', url, callback, errback);
};

ChannelPlateBackground.prototype.GET = function(url, callback, errback) {
  this.request('GET', url, callback, errback);
};

// Cross site XHR WebDAV, xhr(url) -> content 
//
ChannelPlateBackground.prototype.PUT = function(url, callback, errback) {
  this.request('PUT', url, callback, errback);
};

// Cross site XHR WebDAV, xhr(url) -> content 
//
ChannelPlateBackground.prototype.PROPFIND = function(url, callback, errback) {
  this.request('PROPFIND', url, callback, errback);
};


ChannelPlate.ChromeBackground.startAccepter(ChannelPlateBackground);