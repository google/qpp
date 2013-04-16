// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  "use strict";

  /* A view of all editors, visible or not, which may have unsaved changes or which may appear in multiple chains
  */

  QuerypointPanel.Editors = {
    initialize: function(buffers, statusBar, commands) {
      console.assert(buffers);
      
      this._statusBar = statusBar;
      this.commands = commands;
      
      this._editors = [];  // co-indexed with _statusBar.openURLs
      this._statusBar.savedEditors = ko.observableArray();

      chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(this._onResourceUpdate.bind(this));
      window.onbeforeunload = this._beforeUnload.bind(this);
        
      return this;
    },

    /*
      @return true if we find the content matching @param url and open a view on it.
    */
    openURL: function(project, url) {
      var sourceFile = project.getFile(url);
      if (sourceFile) {
        return this.openSourceFileView(sourceFile);
      } else {
        var editorViewModel;
        var foundResource = this._panel.page.resources.some(function(resource){
            if (resource.url) 
              editorViewModel = this.openResourceView(resource);
        }.bind(this));
        if (!editorViewModel)
          editorViewModel = this.openErrorMessage("Found no source file or resource named " + url);
        return editorViewModel;
      }
    },

    openResourceView: function(resource) {
      var editorViewModel = new QuerypointPanel.EditorViewModel();
      resource.getContent(function(content, encoding) {
        this._createEditor(
          editorViewModel,
          resource.url, 
          content
        );
      }.bind(this));
      return editorViewModel;
    },

    openSourceFileView: function(sourceFile) {
      var editorViewModel = new QuerypointPanel.EditorViewModel();  
      this._createEditor(
        editorViewModel,
        sourceFile.name, 
        sourceFile.contents
      );
      return editorViewModel;
    },

    openErrorMessage: function(content) {
      var editorViewModel = new QuerypointPanel.EditorViewModel();  
      this._createEditor(
        editorViewModel,
        "error", 
        content
      );
      return editorViewModel;
    },

    _createEditor: function(editorViewModel, url, content) {
      this._statusBar.openURLs.push(url);
      this._editors.push(editorViewModel);
      editorViewModel.statusSubscription = editorViewModel.status.subscribe(this._updateStatusBar.bind(this, editorViewModel));
      editorViewModel.editorContents({content: content, url: url});
      // TODO editorViewModel.dispose() 
    },

    _updateStatusBar: function(editorViewModel, status) {
      var editor = editorViewModel.editor();
      if (!editor)
        return;
      switch(status) {
        case 'unsaved':
          if (this._statusBar.unsavedEditors.indexOf(editor.getName()) === -1) {
            this._statusBar.unsavedEditors.push(editor);
          }
          break;
        case 'saved':
         var index = editors._statusBar.savedEditors.indexOf(name);
          if (index === -1) {
            editors._statusBar.savedEditors.push(name);
          }
          index = editors._statusBar.unsavedEditors.indexOf(name);
          editors._statusBar.unsavedEditors.splice(index, 1);
          break;
        default:
          console.error('Editors._updateStatusBar unknown editor-status ' + status + ' for ' + editor.getName())
      }
    },

    _getEditorByName: function(name) {
      var index = this._statusBar.openURLs.indexOf(name);
      if (index !== -1)
        return this._editors[index];
    },

    
    _onResourceUpdate: function(resource, content) {
        if (this._statusBar.unsavedEditors.indexOf(resource.url) !== -1) {
          this.commands.show(resource.url);
          alert("This editor has changes and the file has changes");
        } else {
          var editor = this._getEditorByName(resource.url);
          if (editor)
            editor.resetContent(content);
        }
    },

    _beforeUnload: function(event) {
      var sure = null;
      if (this._statusBar.unsavedEditors.length) {
        sure = "You have unsaved changes in " + unsavedEditors.length + "\nfiles: " + unsavedEditors.join(',');
        this.commands.show(unsavedEditors[0]);
      } 
      event.returnValue = sure;
      return sure;  
    },

  }
}());