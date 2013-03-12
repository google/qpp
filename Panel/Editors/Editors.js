// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

  "use strict";

  QuerypointPanel.Editors = {
    initialize: function(buffers, statusBar, commands) {
      console.assert(buffers);
      
      this._statusBar = statusBar;
      this.commands = commands;
      
      this._editors = [];  // co-indexed with _statusBar.openURLs

      this._userOpenedURL = buffers.userOpenedURL;

      this._statusBar.savedEditors = ko.observableArray();

      chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(this._onResourceUpdate.bind(this));
      window.onbeforeunload = this._beforeUnload.bind(this);
      
      this._editorWidth = "100%";
      this._editorHeight = "100%";
        
      return this;
    },

    resize: function(width, height) {
      this._editorWidth = width;  // save to new editors
      this._editorHeight = height;
      this._editors.forEach(function(editor) {
        editor.resize(width, height);
      });
    },

    currentEditorName: function() {
      return this._userOpenedURL;
    },

    openChainedEditor: function(location, baseEditor) {

        console.error("openChainedEditor", location);
    },

    _getEditorByName: function(name) {
      var index = this._statusBar.openURLs.indexOf(name);
      if (index !== -1)
        return this._editors[index];
    },

    _showEditor: function(name, onShown) {
      var editor = this._getEditorByName(name);
      var currentEditor = this._getEditorByName(this._userOpenedURL);
      if (currentEditor) {
        if (currentEditor !== editor) {
          currentEditor.hide();
        }
      }

      if (editor) {
        this._userOpenedURL = name;
        editor.show();
        if (onShown) {
          onShown(editor)
        }
      }

      return editor;
    },
    
    _onChange: function(editor, changes) {
      if (this._statusBar.unsavedEditors.indexOf(editor.getName()) === -1) {
        this._statusBar.unsavedEditors.push(editor);
      }
    },

    createEditor: function(fileEditorView, name, content, callback) {
      this._statusBar.openURLs.push(name);
      var editor = new QuerypointPanel.EditorByCodeMirror(fileEditorView, name, content);
      editor.resize(this._editorWidth, this._editorHeight);
      editor.addListener('onChange', this._onChange.bind(this, editor));
      this._editors.push(editor);
      callback(editor);
    },
    
    openEditorForContent: function(fileEditorView, name, content, onCreated, onShown) {
      var editor = this._getEditorByName(name);
      if (!editor) {
        this.createEditor(fileEditorView, name, content, function(editor) {
          if (onCreated) {
            onCreated(editor);
          }
          if (onShown) {
            onShown(editor)
          }
        }.bind(this));
      } else {
        if (onShown) {
            onShown(editor)
        }
      }
    },
    
    saveFile: function() {
      var editors = this;
      var currentEditor = editors._getEditorByName(editors._userOpenedURL);
      if (!currentEditor) {
        alert("Can't save, there is no current editor"); // alerts are bad UX
        return;
      }
      function onSave(response) {
          var name = currentEditor.getName();
          var index = editors._statusBar.savedEditors.indexOf(name);
          if (index === -1) {
            editors._statusBar.savedEditors.push(name);
          }
          index = editors._statusBar.unsavedEditors.indexOf(name);
          editors._statusBar.unsavedEditors.splice(index, 1);
      }
      function onError(consoleArgs) {
        console.error.apply(this, arguments);
        alert(consoleArgs);
      }
      _saveFileThruDevtoolsSave(url, content, onSave, onError);
      return false;
    },

    _saveFileThruDAV: function(url, content, on) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.addEventListener('load', function(e) {
        if (xhr.status == 200 || xhr.status == 0)
          on.success(xhr.responseText);
      });
      var onFailure = function (msg) {
        on.error(msg);
      };
      xhr.addEventListener('error', onFailure, false);
      xhr.addEventListener('abort', onFailure, false);
      xhr.send(content);
    },
      
    _saveFileThruDevtoolsSave: function(url, content, on) {
      var request = { 
        url: currentEditor.getName(), 
        content: currentEditor.getContent() 
      };
            // send directly to devtools-save
      chrome.extension.sendMessage('jmacddndcaceecmiinjnmkfmccipdphp', request, function maybeSaved(response){
        console.log("saveFile response ", response);
        if (on) {
          if (response.saved) {
            on.success(url, content);
          } else {
            on.error("Save " + url + " failed: "+response.error);
          }
        }
      });
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