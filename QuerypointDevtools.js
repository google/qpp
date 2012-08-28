// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("QuerypointDevtools begins %o", chrome);

function onLoad() {

  function tracePage(url) {
    var remoteScripts = getPageScripts(function (remoteScripts) {
      console.log("remoteScripts ", remoteScripts);
      var project = new QPProject(url, remoteScripts);
      project.runWebPage();
    });
  }
  
  function onNavigated(url) {
    console.log("onNavigated "+url);
    tracePage(url);
  }

  chrome.devtools.network.onNavigated.addListener(onNavigated);
}

window.addEventListener('load', onLoad);

//--------------------------------------------------------------------------
// User interface

var qpPanel; // lazy created view

chrome.devtools.panels.create("Querypoint", "QuerypointIcon.png", "QuerypointPanel.html", function(panel) {
  panel.onShown.addListener(function (panel_window) {
    if (!qpPanel) {
      qpPanel = new QuerypointPanel(panel_window);
    }
    qpPanel.refresh();
  });
});

