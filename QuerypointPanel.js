// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// The Querypoint UI controller. 
// The controller is live as soon as devtools loads. The UI is created 
// and updated when we get panel.onShown, see QuerypointDevtools.js

function QuerypointPanel(panel_window) {
  this.document = panel_window.document;
}

QuerypointPanel.prototype = {
  // Apply any changes since the last onShown call
  refresh: function() {
     console.log("QuerypointPanel onShown, refresh ", qpPanel);
  }
};