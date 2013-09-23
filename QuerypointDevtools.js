// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

//console.log("QuerypointDevtools begins %o", chrome);

var model = {};  // composite model devtools + traceur

var view = {};


//-----------------------------------------------------------------------------
function onLoad() {

  function resetProject(url) {
    model = {};
    model.devtoolsModel = new Querypoint.InspectedPage();  
    model.project = new Querypoint.QPProject(url); 
    model.project.page = model.devtoolsModel;
    if (model.qpPanel)
      model.qpPanel.disconnect();
      
    model.qpPanel = new view.window.QuerypointPanel.Panel(view.panel, view.window, model.project);
    model.qpPanel.connect();
    model.qpPanel.onShown();
  }
    
  function onNavigated(url) {
    if (!view.window)  // Then our panel was never opened.
      return; 
    var QPRuntimeInstalled = model.project && model.project.qpRuntimeInstalled;
    if (!model.project || model.project.url !== url) {
      if (model.qpPanel)
        model.qpPanel.save();
      resetProject(url);
    } else {
      // Same url, but maybe the user reloaded the page without us.
      model.project.onReload( 
        model.qpPanel.pageWasReloaded.bind(model.qpPanel)
      );
    }
    if (QPRuntimeInstalled && model.project && !model.project.qpRuntimeInstalling)
      model.project.reload();
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
      chrome.devtools.inspectedWindow.eval('window.location.toString()', resetProject);
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

