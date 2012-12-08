// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var debug = true;

// Listen for devtools save events and forward them to background for cross site XHR

chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(function saveToDAV(resource) {

  resource.getContent(function onContent(content, encoding) {

    var request = {
      message: 'saveToDAV',
      url: resource.url,
      content: content 
    };

    if (debug) {
      console.log("saveToDAV, getContent ", request);
    }

    function responseHandler(response) {
      console.log("saveToDAV ", response);
    }

    chrome.extension.sendRequest(request, responseHandler);
  
  });

});


