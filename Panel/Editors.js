// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){
  Querypoint.Editors = {
    initialize: function(buffers) {
      console.assert(buffers);
      
      this._openURLs = ko.observableArray();
      this._editors = [];  // co-indexed in _openURLs

      buffers.openURLs.forEach(function(url) {
          var getContentFnc = Querypoint.Editors._asyncLoad.bind(Querypoint.Editors, url);
          Querypoint.Editors.openEditor(url, getContentFnc);
      });

      this._userOpenedURL = ko.observable(buffers.userOpenedURL);

      this._unsavedBuffers = ko.observableArray();
      this._savedBuffers = ko.observableArray();
      
      ko.applyBindings(this, document.querySelector('buffersStatusBar'));
      
      this.userDirectedEditor = document.querySelector('.userDirectedEditor');
      chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(this._onResourceUpdate.bind(this));
      window.onbeforeunload = this._beforeUnload.bind(this);  
      return this;
    },

    _getEditorByName: function(name) {
      var index = this._openURLs.indexOf(name);
      if (index !== -1)
        return this._editors[index];
    },

    _showEditor: function(name) {
      var editor = this._getEditorByName(name);
      var currentEditor = this._getEditorByName(this._userOpenedURL());
      if (currentEditor) {
        if (currentEditor == editor) {
          return;
        } else {
          currentEditor.hide();
        }
      }

      if (editor) {
        this._userOpenedURL(name);
        editor.show();
      }

      return editor;
    },
    
    createEditor: function(name, content, encoding, callback) {
      this._openURLs.push(name);
      this._editors.push(new EditorByCodeMirror(this.userDirectedEditor, name, content));
      callback();
    },
    
    openEditor: function(name, asyncGetContent) {
      var editors = this;
      var editor = editors._getEditorByName(name);

      if (!editor) {
        asyncGetContent(function(content, encoding) {
          editors.createEditor(name, content, encoding, function() {
            editors._showEditor(name);    
            var splash = editors.userDirectedEditor.querySelector('.splash');
            if (splash) {
              splash.parentElement.removeChild(splash);
            }
          });
        });
      } else {
        editors._showEditor(name);
      }   
    },
    
    saveFile: function() {
      var editors = this;
      var currentEditor = editors._getEditorByName(editors._userOpenedURL());
      if (!currentEditor) {
        alert("Can't save, there is no current editor"); // alerts are bad UX
        return;
      }
      var request = { 
        url: currentEditor.getName(), 
        content: currentEditor.getContent() 
      };
      var changes = currentEditor.popChanges(); 
      // send directly to devtools-save
      chrome.extension.sendMessage('jmacddndcaceecmiinjnmkfmccipdphp', request, function maybeSaved(response){
        console.log("saveFile response ", response);
        if (response.saved) {
          editors._savedBuffers.push(currentEditor.getName());
          var index = editors._unsavedBuffers.indexOf(currentEditor.getName());
          editors._unsavedBuffers.splice(index, 1);
        } else {
          currentEditor.unpopChanges(changes);
          alert("Saved failed: "+response.error);
        }
      });
      return false;
    },

    _onResourceUpdate: function(resource, content) {
      var editor = this._getEditorByName[resource.url];
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