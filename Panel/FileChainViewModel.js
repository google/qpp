// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';
  
  var debug = DebugLogger.register('FileChainViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.FileChainViewModel = function(containerElement, panel, statusBar, panelModel) {
    this._panel = panel;
    // Editors and FileViewModels communicate via EditorViewModel
    this._editors = QuerypointPanel.Editors.initialize(panelModel.buffers, statusBar, panel.commands);
    this.fileViewModels = ko.observableArray();
    ko.applyBindings(this, containerElement);
  }
  
  QuerypointPanel.FileChainViewModel.prototype = {

    openChainedFileView: function(url, fromFileView) {
      var linkTarget = this._nameAndOffsetsFromURL(url);
      var fileViewModel = this._getFileViewModelByName(linkTarget.name);
      var editorViewModel;
      if (true || !fileViewModel) {  // no link in the current chain contains this URL, start fresh
        editorViewModel = this.openURL(linkTarget.name).editorViewModel;
      } else {
        var editor = fileViewModel.editor();
        if (!editor.isShowingRegion(linkTarget.start, linkTarget.end)) {  
          fileViewModel = this._appendFileChain(linkTarget, fromFileView);
          editorViewModel = this.openURL(linkTarget.name);
        }  else { //  we are already showing it
          editorViewModel = fileViewModel.editorViewModel;
        }
      }
      editorViewModel.mark(linkTarget);
    },
    /*
      @return true if we find the content matching @param url and open a view on it.
    */
    openURL: function(url) {
      var sourceFile = this._panel.project.getFile(url);
      if (sourceFile) {
        return this.openSourceFileView(sourceFile);
      } else {
        var fileViewModel;
        var foundResource = this._panel.page.resources.some(function(resource){
            if (resource.url) 
              fileViewModel = this.openResourceView(resource);
        }.bind(this));
        if (!fileViewModel)
          fileViewModel = this.openErrorMessage("Found no source file or resource named " + url);
        return fileViewModel;
      }
    },

    /* Start a new chain for a resource */
    openResourceView: function(resource) {
      var editorViewModel = this._editors.openResourceView(resource);
      return this._createFileChain(editorViewModel);
    },
    
    /* Start a new chain for a (traceur) sourceFile */
    openSourceFileView: function(sourceFile) {
      var editorViewModel = this._editors.openSourceFileView(sourceFile);
      var fileViewModel = this._createFileChain(editorViewModel);
      fileViewModel.sourceFile(sourceFile);
      return fileViewModel;
    },
      
    //------------------------------------------------------------------------------------------------------------------  
    project: function() {
      return this._panel.project;
    },

    _getFileViewModelByName: function(name) {
      var found; 
      this.fileViewModels().some(function(fileViewModel) {
        var editor = fileViewModel.editor();
        if(editor && editor.name === name)
          return found = fileViewModel;
      });
      return found;
    },
    
    _nameAndOffsetsFromURL: function(url) {
      var parsedURI = parseUri(url);
      if (parsedURI) {
        var name = url.split('?')[0];
        return {
          name: name, 
          start: parseInt(parsedURI.queryKey.start, 10),
          end: parseInt(parsedURI.queryKey.end, 10),
        };
      } else {
        console.error("_nameAndOffsetsFromURL failed for "+url)
      }
    },
    
    _createFileChain: function(editorViewModel) {
      var fileViewModel = new QuerypointPanel.FileViewModel(this._panel, editorViewModel);
      this.fileViewModels([fileViewModel]);
      return fileViewModel;
    },

    _appendFileChain: function(linkTarget, fromFileView) {
      var editorViewModel = this._editors.openURL(this._panel.project, linkTarget.name);
      var fileViewModel = new QuerypointPanel.FileViewModel(this._panel, editorViewModel);
      this.fileViewModels.unshift(fileViewModel);
      return fileViewModel;
    },

  }
}());
