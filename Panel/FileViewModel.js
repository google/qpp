 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com


(function() {
  'use strict';

  var debug = DebugLogger.register('FileViewModel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });


  QuerypointPanel.FileViewModel = function(querypointViewModel, editorViewModel) {
    // public: 
    this.querypointViewModel = querypointViewModel;  // maybe undefined
    this.editorViewModel = editorViewModel;
    
    this.sourceFile = ko.observable();

    this.filename = ko.computed(function(){
      var editor = this.editor();
      return editor && this.editor().name;
    }.bind(this));

    this.hasQuerypointViewModel = ko.observable(this.querypointViewModel);
  }

  QuerypointPanel.FileViewModel.initialize = function(editors, panel) {
    this._editors = editors;
    this._panel = panel;
  }
  
  QuerypointPanel.FileViewModel.openResourceView = function(resource) {
    var editorViewModel = this._editors.openResourceView(resource);
    var fileViewModel = new QuerypointPanel.FileViewModel(null, editorViewModel);
    return fileViewModel;
  }
    
  QuerypointPanel.FileViewModel.openSourceFileView = function(sourceFile) {
    var editorViewModel = this._editors.openSourceFileView(sourceFile);
    var querypointViewModel = new QuerypointPanel.QuerypointViewModel(this._panel, sourceFile, editorViewModel);
    var fileViewModel =   new QuerypointPanel.FileViewModel(querypointViewModel, editorViewModel);
    return fileViewModel;
  }
  
  QuerypointPanel.FileViewModel.openErrorFileView = function(message) {
    var editorViewModel = this._editors.openErrorMessage(message);
    var fileViewModel =   new QuerypointPanel.FileViewModel(null, editorViewModel);
    return fileViewModel;
  }
    

  QuerypointPanel.FileViewModel.prototype = {

    editor: function() {
      return this.editorViewModel.editor();
    },
    editorBy: function(element) {
      return this.editorViewModel.editorBy(element);
    },
    dispose: function() {
      this.querypointViewModel && this.querypointViewModel.dispose();
    }
  };

}());
