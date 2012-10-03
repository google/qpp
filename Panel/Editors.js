// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){
  Querypoint.Editors = {
    initialize: function(panelModel) {
      this._panelModel = panelModel;
      chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(this._onResourceUpdate.bind(this));
      return this;
    },

    _getEditorByName: function(name) {
      return this._panelModel.openEditors[name];
    },

    _showEditor: function(name) {
      var editor = this._getEditorByName(name);
      if (this._panelModel.currentEditor) {
        if (this._panelModel.currentEditor == editor) {
          return;
        } else {
          this._panelModel.currentEditor.hide();
        }
      }

      if (editor) {
        this._panelModel.currentEditor = editor;
        this._panelModel.currentEditor.show();
      }

      return editor;
    },
    
    openEditor: function(name, getContent) {
      var editor = this._panelModel.editors[name];

      if (!editor) {
        getContent(function (content, encoding) {
          this._panelModel.editors[name] = new EditorByCodeMirror(this.panel_window, this.userDirectedEditor, name, content);
          this._showEditor(name);    
          var splash = this.userDirectedEditor.querySelector('.splash');
          if (splash) {
            splash.parentElement.removeChild(splash);
          }
          
        }.bind(this));
      } else {
        this._showEditor(name);
      }   
    },

    _onResourceUpdate: function(resource, content) {
      var editor = this._editors[resource.url];
      if (editor) {
        if (editor.hasChanges()) {
          this._showEditor(resource.url);
          alert("This editor has changes and the file has changes");
        } else {
          editor.resetContent(content);
        }
      }
    },
  
    _beforeUnload: function(event) {
      var remember = {
        openEditors: []
      };
      var editorWithChanges = [];
      Object.keys(this._editors).forEach(function(name){
        remember.openEditors.push(name);
        if (this._editors[name].hasChanges()) {
          editorWithChanges.push(name);
        }
      }.bind(this));
      var sure = null;
      if (editorWithChanges.length) {
        sure = "You have unsaved changes in " + editorWithChanges.length + " files: " + editorWithChanges.join(',');
        this._showEditor(editorWithChanges.pop());
      } else {
        localStorage.setItem('Querypoint.setup', JSON.stringify(remember));
      }
      event.returnValue = sure;
      return sure;  
    },
    
    // ViewModel
    
    


  }
}());