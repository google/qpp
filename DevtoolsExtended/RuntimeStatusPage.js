// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com


var RUNTIME_INSTALLED = 'runtimeInstalled';
var INSTALLED_SELECTOR = 'div.row';

// From DevtoolsExtended.RuntimeStatus

window.addEventListener('message', function(event) {
  var json = event.data;
  var messageObject = JSON.parse(json);
  if ('runtimeActive' in messageObject) {
    var installed = document.querySelector(INSTALLED_SELECTOR);
    installed.classList[(!!messageObject.runtimeActive ?'add':'remove')](RUNTIME_INSTALLED);
    installed.messageTarget = event.source;
  }
});
 
// To DevtoolsExtended.RuntimeStatus

document.querySelector(INSTALLED_SELECTOR).addEventListener('click', function(event) {
  var installed = document.querySelector(INSTALLED_SELECTOR);
  if (installed.messageTarget) {
    var runtimeActive = installed.classList.contains(RUNTIME_INSTALLED);
    var messageObject = {activateRuntime: !runtimeActive};
    installed.messageTarget.postMessage(JSON.stringify(messageObject), '*');
  } 
});
