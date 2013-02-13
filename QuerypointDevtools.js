// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("QuerypointDevtools begins %o", chrome);

var model = {};  // composite model devtools + traceur

var view = {};


//-----------------------------------------------------------------------------
function onLoad() {

  var loads = 0;

  function resetProject(url) {
    model.devtoolsModel = new InspectedPage();  // TODO rename DevtoolsPageModel
    model.project = new Querypoint.QPProject(url, loads, model.devtoolsModel);
    collectScripts(url);  
  }
  
  function collectScripts(url) {
    model.project.getPageScripts(function () {
      if (!model.qpPanel) {
        // Cross iframe fun
        model.qpPanel = new view.window.QuerypointPanel.Panel(view.panel, view.window, model.devtoolsModel, model.project);
      }
      model.qpPanel.onShown();

    }); 
  }
  
  function onNavigated(url) {
    if (!view.window)
      return; 
    loads += 1;
    if (!model.project || model.project.url !== url) {
      resetProject(url);
    } 
  }

  chrome.devtools.network.onNavigated.addListener(onNavigated);
  
chrome.devtools.panels.create("Querypoint", "Panel/QuerypointIcon.png", "Panel/QuerypointPanel.html", function(panel) {
  view.panel = panel;
  var helpButton = panel.createStatusBarButton("Panel/QuerypointHelpIcon.png", "Querypoint Panel Help", false);
  helpButton.onClicked.addListener(function() {
    if (!model.qpPanel) {
       console.error("No model.qpPanel?");
    } else {
       model.qpPanel.toggleHelp();
    }
  });
  
  panel.onShown.addListener(function (panel_window) {
    view.window = panel_window;
    if (!model.project) {
      chrome.devtools.inspectedWindow.eval('window.__qp_reloads', function(pastReloads) {
        // If we reload qpp, the internal count will be out of sync with the web page content.
        loads = pastReloads || 0;
        chrome.devtools.inspectedWindow.eval('window.location.toString()', resetProject);
      });
    } else {
      model.qpPanel.onShown();
    }
  });
  
  panel.onHidden.addListener(function() {
    if (model.qpPanel)
      model.qpPanel.onHidden();
  });
});

}

window.addEventListener('load', onLoad);

