// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com
console.log("QuerypointDevtools begins %o", chrome);

var model = {};  // composite model devtools + traceur

var view = {};


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
    if (!model.qpPanel) {

        QPProject.reload();
      
    } else {
      model.qpPanel.onShown();
    }
  });
  
  panel.onHidden.addListener(function() {
    if (model.qpPanel)
      model.qpPanel.onHidden();
  });
});

//-----------------------------------------------------------------------------
function onLoad() {

  var loads = 0;

  function resetProject(url) {
    model.devtoolsModel = new InspectedPage();  // TODO rename DevtoolsPageModel
    model.project = new QPProject(url);
    // Cross iframe fun
    model.qpPanel = new view.window.QuerypointPanel.Panel(view.panel, view.window, model.devtoolsModel, model.project);
    model.project.uid = loads;
    model.project.numberOfReloads = 0; 
    console.log(loads + " QPProject created for "+url);
    model.qpPanel.onShown();
    tracePage(url);
  }
  
  function tracePage(url) {

    model.project.getPageScripts(function () {
      model.project.run();
      if (model.qpPanel)
        model.qpPanel.refresh();
    }); 
  }
  
  function onNavigated(url) {
    if (!view.window)
      return; 
    loads += 1;
    if (!model.project || model.project.url !== url) {
      resetProject(url);
    } else {
      tracePage(url);
    }
  }

  chrome.devtools.network.onNavigated.addListener(onNavigated);
  
  //chrome.devtools.inspectedWindow.eval("window.location.toString()", resetProject);
  // For initial development
  //QPProject.reload();
}

window.addEventListener('load', onLoad);

