// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com


// From DevtoolsExtended.RuntimeStatus

window.addEventListener('message', function(event) {
  var json = event.data;
  var messageObject = JSON.parse(json);
  if ('runtimeActive' in messageObject) {
    var installed = document.querySelector('.row input.installed');
    installed.checked = !!messageObject.runtimeActive;
    installed.classList.toggle('unchecked');
    installed.messageTarget = event.source;
  }
});

// To DevtoolsExtended.RuntimeStatus

document.querySelector('div.row input.install').addEventListener('change', function(event) {
  var installed = document.querySelector('.row input.installed');
  if (installed.messageTarget) {
    var messageObject = {activateRuntime: this.checked};
    installed.messageTarget.postMessage(JSON.stringify(messageObject), '*');
  } else {
    this.checked = !this.checked;
  }
});

document.querySelector('div.row input.installed').addEventListener('change', function(event) {
  this.checked = !this.checked; // read-only!
})