// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var debug = true;


function saveByPUT(url, content) {
  var xhr = new XMLHttpRequest();
  xhr.open('PUT', url);
  xhr.addEventListener('load', function(e) {
    if (xhr.status == 200 || xhr.status == 0) {
      webkitNotifications.createNotification(
        'saved-ok.png',
        'Saved',
        url
      ).show();
    }
  });
  var onFailure = function (msg) {
    webkitNotifications.createNotification(
        'error.png',
        'Did not save ' + url,
        msg
      ).show();
  };
  xhr.addEventListener('error', onFailure, false);
  xhr.addEventListener('abort', onFailure, false);
  xhr.send(content);
}

function listenForSave(request, sender, sendResponse) {
  if (request.message === 'saveToDAV') {
    saveByPUT(request.url, request.content);
    sendResponse("got request trying to send");
  }
}

chrome.extension.onRequest.addListener(listenForSave);