// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// The Querypoint UI controller. 
// The controller is live as soon as devtools loads. The UI is created 
// and updated when we get panel.onShown, see QuerypointDevtools.js

/**
 * @param panel {ExtensionPanel} devtools panel
 * @param panel_window {Window} the content window of the extension panel
 */

function QuerypointPanel(panel, panel_window, page) {
  this.panel = panel;
  this.panel_window = panel_window;
  this.document = panel_window.document;
  this.page = page;
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
    this.keybindings.enter();
    qpPanel.refresh();
  },

  onHidden: function() {
    this.keybindings.exit();
  },

  // Apply any changes since the last onShown call
  refresh: function() {
     console.log("QuerypointPanel onShown, refresh ", qpPanel);
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
      splash.parentElement.removeChild(splash);
    }
    return false; 
  },

  // These methods are bound to |this| panel
  commands: {  // KeyBindings must be kept in sync
    selectFile: function() {
      console.log("selectFile");
      var itemSelector = this.panel.createItemSelector("SelectFile");
      itemSelector.onSelectedItem.addListener(this.onSelectedFile.bind(this));
      var items = [];
      this.page.resources.forEach(function(resource, index) {
        var parsedURI = parseUri(resource.url);
        if (parsedURI.file) {
          items.push({
            key: parsedURI.file,  // The field searched
            title: parsedURI.file,  // the field shown. Why are these not the same?
            suffix: "",
            subtitle: parsedURI.directory,
            index: index // extra, JSONable property
          });          
        }  // else internal like 'event-bindings'
      });
      itemSelector.addItems(items);
      return false;
    }
  },



};