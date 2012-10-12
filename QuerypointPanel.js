// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Interface between Querypoint Panel and chrome.devtools extension system
//  

/**
 * @param panel {ExtensionPanel} devtools panel
 * @param panel_window {Window} the content window of the extension panel
 */

function QuerypointPanel(extensionPanel, panel_window, page, project) {
  this.extensionPanel = extensionPanel;
  this.panel_window = panel_window;
  this.document = panel_window.document;
  this.page = page;
  this.project = project;

  this.userDirectedEditor = this.document.querySelector('.userDirectedEditor');

  this._initModel();
  this._onResize();
}

QuerypointPanel.prototype = {
  onShown: function() {
    this._isShowing = true;
    this.keybindings.enter();
    this.refresh();
  },

  onHidden: function() {
    this.keybindings.exit();
    this._isShowing = false;
  },

  // Apply any changes since the last onShown call
  refresh: function() {
     console.log("QuerypointPanel refresh "+this._isShowing, this);
  },
  

  _openResource: function(resource, item) {
    console.log("onSelectedFile %o ", item);
    this._editors.openEditor(resource.url, resource.getContent);
    return false; 
  },
  
  _openSourceFile: function(sourceFile, item) {
    this._editors.openEditor(sourceFile.name, function(contentHandler) {
      contentHandler(sourceFile.contents);
    });
  },

  // These methods are bound to |this| panel
  commands: {  // KeyBindings must be kept in sync

    // Open a dialog filled with file names for user selection
    //
    selectFile: function() {
      console.log("selectFile");
      var uriItems = new URISelector(this.extensionPanel);
      this.project.getSourceFiles().forEach(function(sourceFile){
        uriItems.appendItem('open: '+sourceFile.name, this._openSourceFile.bind(this, sourceFile));
      }.bind(this));
      this.page.resources.forEach(function(resource, index) {
        uriItems.appendItem('open: '+resource.url, this._openResource.bind(this, resource));
      }.bind(this));
      uriItems.selectItem();
      return false;
    },

    saveFile: function() {
      return this._editors.saveFile();
    }
  },

  _initKeys: function() {
    this.keybindings = new KeyBindings(this.panel_window);

    // rebind this.commands to create a subset of methods callable via user keys
    Object.keys(this.commands).forEach(function(key){
      this.commands[key] = this.commands[key].bind(this);
    }.bind(this));
    this.keybindings.apply(this.commands);
  },

  _openContextMenu: function(event) {
    console.log("_openContextMenu", event);
  },

  _takeContextMenu: function(event) {
    if (event.buttons === 2) {
      this._openContextMenu(event);
    }
  },

  _onResize: function() {
    this._setHeight(this._setWidth());
  },
  
  _setWidth: function() {
    var sourceViewport = this.document.querySelector('.sourceViewport'); 
    var availableWidth = document.body.offsetWidth;
    var cols = sourceViewport.children;
    var width = availableWidth - (availableWidth / 1.618);
    for (var i = 0; i < cols.length - 1; i++) {
      cols[i].style.width = width  + 'px';
      availableWidth = availableWidth - width;
    }
    cols[cols.length - 1].style.width = availableWidth + 'px';
    return availableWidth;
  },
  
  _setHeight: function(width) {
    var sourceViewport = this.document.querySelector('.sourceViewport'); 
    var availableHeight = sourceViewport.parentElement.offsetHeight;
    var rows = sourceViewport.parentElement.children;
    for(var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.classList.contains('sourceViewport'))
        continue;
      console.log("availableHeight: "+availableHeight+" minus "+row.offsetHeight+" = "+(availableHeight - row.offsetHeight), row);
      availableHeight = availableHeight - row.offsetHeight;
    }
    sourceViewport.style.height = availableHeight + 'px';
    this._editors.resize(width, availableHeight);
  },
  
  _initMouse: function() {
    this.document.addEventListener('mousedown', this._takeContextMenu.bind(this));
    this.panel_window.addEventListener('resize', this._onResize.bind(this));
  },
  
  _initViewModels: function(panelModel) {
    this._log = Querypoint.Log.initialize();
    this._scrubber = Querypoint.LogScrubber.initialize(this._log, panelModel.scrubber);
    this._editors = Querypoint.Editors.initialize(panelModel.buffers);

  },

  _restore: function(panelModel) {
    console.log("restore", panelModel);
    this._initViewModels(panelModel);

    this._initKeys();
    this._initMouse();
    this.document.querySelector('.panelInitialization').style.display = 'none';
  },

  _initModel: function() {
    var panel = this;
    Querypoint.Storage.recall(
      function(model) {
        panel._restore(model);
      },
      function() {
        panel._restore(new Querypoint.PanelModel(panel.project.url));
      }
    );
  },

};