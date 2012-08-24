// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

function QuerypointBackground(rawPort) {
  ChannelPlate.ChromeBackground.call(this, rawPort);
}

QuerypointBackground.prototype = Object.create(ChannelPlate.ChromeBackground.prototype);

// Cross site XHR, xhr(url) -> content 
//
QuerypointBackground.prototype.xhr = function(url, callback, errback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.addEventListener('load', function(e) {
    if (xhr.status == 200 || xhr.status == 0) {
      callback(xhr.responseText);
    } else {
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


ChannelPlate.ChromeBackground.startAccepter(QuerypointBackground);