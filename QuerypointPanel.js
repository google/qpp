// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// The Querypoint UI controller. 
// The controller is live as soon as devtools loads. The UI is created 
// and updated when we get panel.onShown, see QuerypointDevtools.js

/**
 * @param panel {ExtensionPanel} devtools panel
 * @param panel_window {Window} the content window of the extension panel
 */

function QuerypointPanel(panel, panel_window, page, project) {
  this.panel = panel;
  this.panel_window = panel_window;
  this.document = panel_window.document;
  this.page = page;
  this.project = project;

  this._editors = {};

  this.keybindings = new KeyBindings(panel_window);

  // rebind this.commands to create a subset of methods callable via user keys
  Object.keys(this.commands).forEach(function(key){
    this.commands[key] = this.commands[key].bind(this);
  }.bind(this));
  this.keybindings.apply(this.commands);

  this.userDirectedEditor = this.document.querySelector('.userDirectedEditor')
}

QuerypointPanel.prototype = {
  onShown: function() {
    this._isShowing = true;
    this.keybindings.enter();
    qpPanel.refresh();
  },

  onHidden: function() {
    this.keybindings.exit();
    this._isShowing = false;
  },

  // Apply any changes since the last onShown call
  refresh: function() {
     console.log("QuerypointPanel refresh "+this._isShowing, qpPanel);
  },

  _openEditor: function(name, getContent) {
      var editor = this._editors[name];
      if (this._currentEditor && this._currentEditor == editor) {
        return;
      }
      //this._currentEditor.hide();
      if (editor) {
        this._currentEditor = editor;
        //this._currentEditor.show();
      } else {
        getContent(function (content, encoding) {
          this._currentEditor = this._editors[name] = this.panel_window.CodeMirror(this.userDirectedEditor, {
            value: content,
            mode:  "javascript",
            lineNumbers: true,
            theme: "monokai"  // TODO UI to change themes
          });  
        }.bind(this));
     }
      var splash = this.userDirectedEditor.querySelector('.splash');
      if (splash) {
        splash.parentElement.removeChild(splash);
      }
  },

  _openResource: function(resource, item) {
    console.log("onSelectedFile %o ", item);
    this._openEditor(resource.url, resource.getContent);
    return false; 
  },
  
  _openSourceFile: function(sourceFile, item) {
    this._openEditor(sourceFile.name, function(contentHandler) {
      contentHandler(sourceFile.contents);
    });
  },

  // These methods are bound to |this| panel
  commands: {  // KeyBindings must be kept in sync

    // Open a dialog filled with file names for user selection
    //
    selectFile: function() {
      console.log("selectFile");
      var uriItems = new URISelector(this.panel);
      this.project.getSourceFiles().forEach(function(sourceFile){
        uriItems.appendItem(sourceFile.name, this._openSourceFile.bind(this, sourceFile));
      }.bind(this));
      this.page.resources.forEach(function(resource, index) {
        uriItems.appendItem(resource.url, this._openResource.bind(this, resource));
      }.bind(this));
      uriItems.selectItem();
      return false;
    }
  },



};