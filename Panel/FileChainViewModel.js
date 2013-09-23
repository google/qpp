// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';
  
  var debug = DebugLogger.register('FileChainViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.FileChainViewModel = function(containerElement, panel) {
    this._panel = panel;
    this.fileViewModels = ko.observableArray();
    this.editorSizes = ko.computed(function() {
      this.fileViewModels().forEach(function(fileViewModel){
        var editor = fileViewModel.editorViewModel && fileViewModel.editorViewModel.editor();
        if (editor)
          editor.setSize();
      }); 
    }.bind(this)).extend({throttle: 1}); // delay to prevent sizing on N+1 views

    ko.applyBindings(this, containerElement);
  }
  
  QuerypointPanel.FileChainViewModel.prototype = {

    openChainedFileView: function(url, fromFileView) {
      var sourceRegion = this._nameAndOffsetsFromURL(url);
      var editorViewModel;
      if (!fromFileView) {  // no link in the current chain contains this URL, start new chain
           fileViewModel = this.openURL(sourceRegion.name);
           editorViewModel = fileViewModel.editorViewModel;
           this._createFileChain(fileViewModel);
      } else {  // we are opening a new link in an existing chain
        var fromFileViewModel = this.fileViewModels()[fromFileView.getAttribute('chainIndex')];
        var editor = fromFileViewModel.editor();
        if (!editor.isShowingRegion(sourceRegion.start, sourceRegion.end)) {
          var fileViewModel = this.openURL(sourceRegion.name);   
          this._appendFileChain(fileViewModel, fromFileViewModel);
          editorViewModel = fileViewModel.editorViewModel;
        }  else { //  we are already showing it
          editorViewModel = fromFileViewModel.editorViewModel;
        }
      }
      editorViewModel.mark(sourceRegion);
    },
    /*
      @return true if we find the content matching @param url and open a view on it.
    */
    openURL: function(url) {
      var sourceFile = this._panel.project.getFile(url);
      if (sourceFile) {
        return QuerypointPanel.FileViewModel.openSourceFileView(sourceFile);
      } else {
        var fileViewModel;
        var foundResource = this._panel.project.page.resources.some(function(resource){
            if (resource.url) 
              fileViewModel = QuerypointPanel.FileViewModel.openResourceView(resource);
        }.bind(this));
        if (!fileViewModel)
          fileViewModel = QuerypointPanel.FileViewModel.openErrorMessage("Found no source file or resource named " + url);
        return fileViewModel;
      }
    },

    /* Start a new chain for a resource */
    openResourceView: function(resource) {
      if (/\.js$/.test(resource.url)) {
        resource.getContent(function(content) {
            var file = this._panel.project.addFileFromContent(resource.url, content);
            this.openSourceFileView(file);    
        }.bind(this));
      } else {
        var fileViewModel = QuerypointPanel.FileViewModel.openResourceView(resource);
        this._createFileChain(fileViewModel);  
      }      
    },
    
    /* Start a new chain for a (traceur) sourceFile */
    openSourceFileView: function(sourceFile) {
      var fileViewModel = QuerypointPanel.FileViewModel.openSourceFileView(sourceFile);
      this._createFileChain(fileViewModel);
    },

    showFileViewModel: function(fileViewModel) {
      this.fileViewModels([fileViewModel]);
    },
      
    //------------------------------------------------------------------------------------------------------------------  
    project: function() {
      return this._panel.project;
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
        console.error("_nameAndOffsetsFromURL failed for "+url);
      }
    },

    //------- Chain

    _createFileChain: function(fileViewModel) {
      this._dispose();
      this.fileViewModels([fileViewModel]);
      return fileViewModel;
    },

    _appendFileChain: function(fileViewModel, fromFileViewModel) {
      this._dispose();
      this.fileViewModels([fromFileViewModel, fileViewModel]);
      return fileViewModel;
    },

    _dispose: function(){
      this.fileViewModels().forEach(function(fileViewModel){
        fileViewModel.dispose();
      });
    }

  }
}());
