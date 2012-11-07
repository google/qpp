// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){
  QuerypointPanel.Editors = {
    initialize: function(buffers, editorsViewModel) {
      console.assert(buffers);
      
      this._viewModel = editorsViewModel;
      
      this._editors = [];  // co-indexed with _viewMode.openURLs

      this._userOpenedURL = buffers.userOpenedURL;

      this._viewModel.savedEditors = ko.observableArray();

      this.userDirectedEditor = document.querySelector('.userDirectedEditor');
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

    createEditor: function(name, content, callback) {
      this._viewModel.openURLs.push(name);
      var editor = new EditorByCodeMirror(this.userDirectedEditor, name, content);
      editor.resize(this._editorWidth, this._editorHeight);
      editor.addListener('onChange', this._onChange.bind(this, editor));
      this._editors.push(editor);
      callback(editor);
    },
    
    openEditorForContent: function(name, content, onCreated, onShown) {
      var editor = this._getEditorByName(name);
      if (!editor) {
        this.createEditor(name, content, function(editor) {
          if (onCreated) {
            onCreated(editor);
          }
          this._showEditor(name, onShown);
        }.bind(this));
      } else {
        this._showEditor(name, onShown);
      }
    },
    
    saveFile: function() {
      var editors = this;
      var currentEditor = editors._getEditorByName(editors._userOpenedURL);
      if (!currentEditor) {
        alert("Can't save, there is no current editor"); // alerts are bad UX
        return;
      }
      var request = { 
        url: currentEditor.getName(), 
        content: currentEditor.getContent() 
      };
      // send directly to devtools-save
      chrome.extension.sendMessage('jmacddndcaceecmiinjnmkfmccipdphp', request, function maybeSaved(response){
        console.log("saveFile response ", response);
        if (response.saved) {
          var name = currentEditor.getName();
          var index = editors._viewModel.savedEditors.indexOf(name);
          if (index === -1) {
            editor._viewModel.savedEditors.push(name);
          }
          index = editors.unsavedBufferNames.indexOf(name);
          editors.unsavedBufferNames.splice(index, 1);
        } else {
          alert("Saved failed: "+response.error);
        }
      });
      return false;
    },

    _onResourceUpdate: function(resource, content) {
        if (this._viewModel.unsavedEditors.indexOf(resource.url) !== -1) {
          this._showEditor(resource.url);
          alert("This editor has changes and the file has changes");
        } else {
          editor.resetContent(content);
        }
    },
  
    _beforeUnload: function(event) {
      var sure = null;
      if (this._viewModel.unsavedEditors.length) {
        sure = "You have unsaved changes in " + unsavedBufferNames.length + "\nfiles: " + unsavedBufferNames.join(',');
        this._showEditor(unsavedBufferNames[0]);
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