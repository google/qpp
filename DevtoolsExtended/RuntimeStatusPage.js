// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com


// From DevtoolsExtended.RuntimeStatus

window.addEventListener('message', function(event) {
  var json = event.data;
  var messageObject = JSON.parse(json);
  if ('runtimeActive' in messageObject) {
    var checkbox = document.querySelector('.row input.installed');
    checkbox.checked = !!messageObject.runtimeActive;
    checkbox.classList.toggle('unchecked');
  }
});

// To DevtoolsExtended.RuntimeStatus

document.querySelector('div.row input.install').addEventListener('change', function(event) {
  var messageObject = {activateRuntime: this.checked};
  window.postMessage(JSON.stringify(messageObject), '*');
});

document.querySelector('div.row input.installed').addEventListener('change', function(event) {
  this.checked = !this.checked; // read-only!
})