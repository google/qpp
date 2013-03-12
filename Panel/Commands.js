// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  'use strict';

  var debug = DebugLogger.register('Commands', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  // These methods close over panel

  QuerypointPanel.Commands = function(panel) {    
    // Open a dialog filled with file names for user selection
    //
    this.selectFile = function() {
      if (debug) console.log("QuerypointPanel.selectFile");
      var uriItems = new QuerypointPanel.URISelector(panel.extensionPanel);
      var names = {};
      panel.project.getSourceFiles().forEach(function(sourceFile){
        names[sourceFile.name] = sourceFile;
        uriItems.appendItem('open: '+sourceFile.name, panel.openPrimaryFileView.bind(panel, sourceFile));
      }.bind(panel));
      panel.page.resources.forEach(function(resource, index) {
        if (!names.hasOwnProperty(resource.url))
          uriItems.appendItem('open: '+resource.url, panel._openResourceAndRefresh.bind(panel, resource));
      }.bind(panel));
      uriItems.selectItem();
      return false;
    };

    // Open an editor to view information selected out of another editor
    // e.g. trace with refs to other files or call stack with refs to older frames
    this.openChainedEditor = function(url) {
      var linkTarget = panel.linkTargetFromURL(url);
      var fileViewModel = panel.getFileViewModelByName(linkTarget.name);
      if (fileViewModel) {
        var mark = fileViewModel.editor().showRegion(linkTarget.start, linkTarget.end);
        if (mark) {
          var clearMark = function(event) {
            mark.clear();
            if (debug) console.log("cleared mark because of mouseout on ", event.target);
            $(panel.document).off('mouseout', clearMark);
          }
          $(panel.document).on('mouseout', clearMark);
        }
      } else {
        var sourceFile = panel.project.getFile(linkTarget.name);
        if (sourceFile) {
          console.error("QuerypointPanel.onShown");   
        } else {
          console.error("QuerypointPanel.openChainedEditor but no sourcefile!");
        }
      }
    };

    this.saveFile = function() {
      return panel._editors.saveFile();
    };
  };

}());
