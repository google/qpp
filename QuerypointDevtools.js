// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("QuerypointDevtools begins %o", chrome);

var page = new InspectedPage();
var project; 

//--------------------------------------------------------------------------
// User interface

var qpPanel; // lazy created view

chrome.devtools.panels.create("Querypoint", "Panel/QuerypointIcon.png", "Panel/QuerypointPanel.html", function(panel) {
  var helpButton = panel.createStatusBarButton("Panel/QuerypointHelpIcon.png", "Querypoint Panel Help", false);
  helpButton.onClicked.addListener(function() {
    if (!qpPanel) {
       console.error("No qpPanel?");
    } else {
       qpPanel.toggleHelp();
    }
  });
  
  panel.onShown.addListener(function (panel_window) {
    if (!qpPanel) {
      if (!project) console.error("Trying to create QPPanel with no project");
      qpPanel = new panel_window.QuerypointPanel.Panel(panel, panel_window, page, project);
    }
    qpPanel.onShown();
  });
  panel.onHidden.addListener(function() {
    if (qpPanel)
      qpPanel.onHidden();
  });
});

//-----------------------------------------------------------------------------
function onLoad() {

  var loads = 1;

  function tracePage(url) {
    project = new QPProject(url);
    project.uid = loads;
    console.log(loads + " QPProject created for "+url);
    project.getPageScripts(function () {
      project.run();
      if (qpPanel)
        qpPanel.refresh();
    }); 
  }
  
  function onNavigated(url) {
    loads += 1;
    tracePage(url);
  }

  chrome.devtools.network.onNavigated.addListener(onNavigated);
  // For initial development
  QPProject.reload();
}

window.addEventListener('load', onLoad);

