// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  var tracesSidebarPane;
  var querypointsSidebarPane;

  function onSelectionChanged(selection) {
      if (tracesSidebarPane)
        tracesSidebarPane.setObject(selection);
  }
  chrome.devtools.panels.sources.onSelectionChanged.addListener(onSelectionChanged);

  function onTracesSidebarPane(sidebarPane) {
    tracesSidebarPane = sidebarPane;
  }

  chrome.devtools.panels.sources.createSidebarPane("Querypoint Traces", onTracesSidebarPane);

  function onQuerypointsSidebarPane(sidebarPane) {
    querypointsSidebarPane = sidebarPane;
    var querypoints = [];
    querypointsSidebarPane.setObject(querypoints);
  }

  chrome.devtools.panels.sources.createSidebarPane("Querypoints", onQuerypointsSidebarPane);

})();