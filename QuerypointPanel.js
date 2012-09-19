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

  onSelectedFile: function(item) {
    if (item) {   
      console.log("onSelectedFile %o resource.url:%s", item, this.page.resources[item.index].url);
      var resource = this.page.resources[item.index];
      resource.getContent(function(content, encoding) {
        var myCodeMirror = this.panel_window.CodeMirror(this.userDirectedEditor, {
          value: content,
          mode:  "javascript",
          lineNumbers: true,
          theme: "monokai"  // TODO UI to change themes
        });  
      }.bind(this));
      var splash = this.userDirectedEditor.querySelector('.splash');
      if (splash) {
        splash.parentElement.removeChild(splash);
      }
    }
    return false; 
  },
  
  _createItem: function(url, index) {
    var parsedURI = parseUri(resource.url);
    if (parsedURI.file) {
      return {
        key: parsedURI.file,  // The field searched
        title: parsedURI.file,  // the field shown. Why are these not the same?
        suffix: "",
        subtitle: parsedURI.directory,
        index: index // extra, JSONable property
      };
    }  // else internal like 'event-bindings'         
  },

  // These methods are bound to |this| panel
  commands: {  // KeyBindings must be kept in sync

    // Open a dialog filled with file names for user selection
    //
    selectFile: function() {
      console.log("selectFile");
      // TODO bundle this in FileSelector
      var itemSelector = this.panel.createItemSelector("SelectFile");

      itemSelector.onSelectedItem.addListener(this.onSelectedFile.bind(this));
      var items = [];
      this.project.getSourceFiles().forEach(function(sourceFile){
        var item = this._createItem(sourceFile.name, items.length);
        if (item)
          items.push(item);
      }.bind(this));
      this.page.resources.forEach(function(resource, index) {
        var item = this._createItem(resource.url, items.length);    
        if (item)
          items.push(item);
      });
      itemSelector.addItems(items);
      return false;
    }
  },



};