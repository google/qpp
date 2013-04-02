// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';
  
  var debug = DebugLogger.register('EditorViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  QuerypointPanel.EditorViewModel = function() {

    // We don't know the element on creation, we need to get it from the ko template expansion
    this.editorElement = ko.observable();
    this.editorContents = ko.observable();
    this.highlightRegion = ko.observable();

    this.editor = ko.computed(function(){
      var fileEditorView = this.editorElement();
      var contents = this.editorContents();
      if (fileEditorView && contents) {   
        var editor = new QuerypointPanel.EditorByCodeMirror(fileEditorView, contents.url, contents.content);
        editor.resize(this._editorWidth, this._editorHeight);
        editor.addListener('onChange', this._onChange.bind(this, editor));
        return editor;
      }    
    }.bind(this));

    this.highlight = ko.computed(function(){
      var editor = this.editor();
      var linkTarget = this.highlightRegion();
      if (editor && linkTarget) {
        this._markRegion(editor, linkTarget);
      }
    }.bind(this)).extend({ throttle: 50 });
      
    this.status = ko.observable('unchanged');  // 'unchanged' -> 'unsaved' -> 'saved'
  }

  QuerypointPanel.EditorViewModel.prototype = {
    editorBy: function(element) {
      this.editorElement(element);
      return 'CodeMirror';
    },

    _onChange: function(editor, changes) {
      this.status('unsaved');
    },

    saveFile: function() {
      var content = this.editor().getContent();
      var url = this.editor().getName();
      function onError(consoleArgs) {
        console.error.apply(this, arguments);
        alert(consoleArgs);
      }
      _saveFileThruDevtoolsSave(url, content, this.status.bind(this, 'saved'), onError);
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
    
    mark: function(linkTarget) {
      this.highlightRegion(linkTarget);
    }, 
    
    _markRegion: function(editor, linkTarget){
      var mark = editor.showRegion(linkTarget.start, linkTarget.end);
      if (mark) {
       var clearMark = function(event) {
         mark.clear();
         if (debug) console.log('cleared mark because of mouseout on ', event.target);
         $(document).off('mouseout', clearMark);
       }
       $(document).on('mouseout', clearMark);
     }
    },
  };
}());
