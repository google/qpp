// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Simulate Querypoint debugging on demo.js

function onLoad() {
  function doDemo() {
    Querypoints.traceIdentifier('prop'); 
  }
  document.querySelector('.demo').addEventListener('click', doDemo);
}

window.addEventListener('load', onLoad);
