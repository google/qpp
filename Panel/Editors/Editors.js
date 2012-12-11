// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){
  QuerypointPanel.Editors = {
    initialize: function(buffers, editorsViewModel, commands) {
      console.assert(buffers);
      
      this._viewModel = editorsViewModel;
      this.commands;
      
      this._editors = [];  // co-indexed with _viewMode.openURLs

      this._userOpenedURL = buffers.userOpenedURL;

      this._viewModel.savedEditors = ko.observableArray();

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
      var index = this._viewModel.openURLs.indexOf(name);
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
      if (this._viewModel.unsavedEditors.indexOf(editor.getName()) === -1) {
        this._viewModel.unsavedEditors.push(editor);
      }
    },

    createEditor: function(fileEditorView, name, content, callback) {
      this._viewModel.openURLs.push(name);
      var editor = new EditorByCodeMirror(fileEditorView, name, content);
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
          var index = editors._viewModel.savedEditors.indexOf(name);
          if (index === -1) {
            editors._viewModel.savedEditors.push(name);
          }
          index = editors._viewModel.unsavedEditors.indexOf(name);
          editors._viewModel.unsavedEditors.splice(index, 1);
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
        if (this._viewModel.unsavedEditors.indexOf(resource.url) !== -1) {
          this.commands.show(resource.url);
          alert("This editor has changes and the file has changes");
        } else {
          editor.resetContent(content);
        }
    },
  
    _beforeUnload: function(event) {
      var sure = null;
      if (this._viewModel.unsavedEditors.length) {
        sure = "You have unsaved changes in " + unsavedEditors.length + "\nfiles: " + unsavedEditors.join(',');
        this.commands.show(unsavedEditors[0]);
      } 
      event.returnValue = sure;
      return sure;  
    },
  
    requestCreator: new ChannelPlate.RequestCreator(ChannelPlate.DevtoolsTalker),

    _asyncLoad: function(url, fncOfContent) {
      this.requestCreator.request('xhr', [url], function() {
        if (arguments[0] === 'Error') {
          console.error('XHR failed ' + arguments[1]);
        } else {
          fncOfContent(arguments[0]);
        }
      });
    }
  }
}());