// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Interface between Querypoint Panel and chrome.devtools extension system
//  

/**
 * @param panel {ExtensionPanel} devtools panel
 * @param panel_window {Window} the content window of the extension panel
 */

(function(){

QuerypointPanel.Panel = function (extensionPanel, panel_window, page, project) {
  this.extensionPanel = extensionPanel;
  this.panel_window = panel_window;
  this.document = panel_window.document;
  this.page = page;
  this.project = project;

  this._openWhenAvailable = []; // TODO monitor new script addition and edit any on this list
  this._fileViewModels = {}; // one per editor

  this.userDirectedEditor = this.document.querySelector('.userDirectedEditor');
  this._onEditorCreated = this._onEditorCreated.bind(this);
  this._initModel();
  this._onResize();  // set initial sizes
}


QuerypointPanel.Panel.debug = false;

QuerypointPanel.Panel.prototype = {
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
     console.log("QuerypointPanel.Panel refresh "+this._isShowing, this);
     var QPOutput = document.querySelector('.QPOutput');
     var name = this._editors.currentEditorName();
     if (name && this._fileViewModels[name]) {
       QPOutput.classList.remove('hide');
       this._fileViewModels[name].update();
     } else {
       QPOutput.classList.add('hide');
     }

  },
  
  toggleHelp: function() {
    if (this._helping) {
      this._helping = false;
      this._hideHelp();
    } else {
      this._helping = true;
      this._showHelp();
    }
  },
  
  _showHelp: function() {
      document.body.classList.add('showHelp');
  },
  _hideHelp: function() {
      document.body.classList.remove('showHelp');
  },
  
  _onEditorCreated: function(editor) {
    var sourceFile = this.project.getFile(editor.name); 
    if (sourceFile) {
      var tree = this.project.getParseTree(sourceFile);
      this._fileViewModels[editor.name] = new QuerypointPanel.FileViewModel(editor, sourceFile, tree, this);
    } else {
      if (this.project.isGeneratedFile(editor.name)) {
        console.log("Created editor for generated file");
      } else {
        console.warn("No sourceFile for " + editor.name);
      }
    }
  },

  _openURL: function(url) {
    var foundResource = this.page.resources.some(function(resource){
        if (resource.url) this._openResourceAndRefresh(resource);
    }.bind(this));
    if (!foundResource) {
      var sourceFile = this.project.getFile(url);
      if (sourceFile) {
        this._openSourceFileAndRefresh(sourceFile);
      } else {
        this._openWhenAvailable.push(url);
      }
    }
  },

  _openResourceAndRefresh: function(resource, item) {
    return this._openResource(resource, item, this.refresh.bind(this));
  },
  
  _openResource: function(resource, item, onShown) {
    resource.getContent(function(content, encoding) {
      this._editors.openEditorForContent(
        resource.url, 
        content,
        this._onEditorCreated.bind(this), 
        onShown
      );
    }.bind(this));
  },
  
  _openSourceFileAndRefresh: function(sourceFile) {
    this._openSourceFile(sourceFile, this.refresh.bind(this));
  },
  
  _openSourceFile: function(sourceFile, onShown) {
    this._editors.openEditorForContent(
      sourceFile.name, 
      sourceFile.contents,
      this._onEditorCreated,
      onShown
    );
  },
  
  urlFromLocation: function(location) {
    return location.start.source.name + '?start=' + location.start.offset + '&end=' + location.end.offset + '&';
  },
  
  locationFromURL: function(url) {
    var parsedURI = parseUri(url);
    if (parsedURI) {
      var name = url.split('?')[0];
      return {
        name: name, 
        start: parseInt(parsedURI.queryKey.start, 10),
        end: parseInt(parsedURI.queryKey.end, 10),
      };
    } else {
      console.error("locationFromURL failed for "+url)
    }
  },

  // These methods are bound to |this| panel
  commands: {  // KeyBindings must be kept in sync

    // Open a dialog filled with file names for user selection
    //
    selectFile: function() {
      console.log("selectFile");
      var uriItems = new URISelector(this.extensionPanel);
      this.project.getSourceFiles().forEach(function(sourceFile){
        uriItems.appendItem('open: '+sourceFile.name, this._openSourceFileAndRefresh.bind(this, sourceFile));
      }.bind(this));
      this.page.resources.forEach(function(resource, index) {
        uriItems.appendItem('open: '+resource.url, this._openResourceAndRefresh.bind(this, resource));
      }.bind(this));
      uriItems.selectItem();
      return false;
    },

    // Open an editor to view information selected out of another editor
    // e.g. trace with refs to other files or call stack with refs to older frames
    openChainedEditor: function(url, editor) {
      var location = this.locationFromURL(url);
      var sourceFile = this.project.getFile(location.name);
      if (sourceFile) {
         this._openSourceFile(sourceFile, function() { 
           console.log("onShowne"); 
         });
      } else {
        console.error("openChainedEditor but no sourcefile!");
      }
    },

    saveFile: function() {
      return this._editors.saveFile();
    },
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

  _onClickPanel: function(event) {
    if (event.button === 2) {
      this._openContextMenu(event);
    } else {
      if (event.target.classList.contains('QPOutput')) {
        this.refresh();
      }
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
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.classList.contains('sourceViewport'))
        continue;
      if (QuerypointPanel.Panel.debug)
        console.log("availableHeight: "+availableHeight+" minus "+row.offsetHeight+" = "+(availableHeight - row.offsetHeight), row);
      availableHeight = availableHeight - row.offsetHeight;
    }
    sourceViewport.style.height = availableHeight + 'px';
    var cols = sourceViewport.children;
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      col.style.height = availableHeight + 'px';
    }
    this._editors.resize(width, availableHeight);
  },
  
  _initMouse: function() {
    this.document.addEventListener('mousedown', this._onClickPanel.bind(this));
    this.panel_window.addEventListener('resize', this._onResize.bind(this));
  },
  
  _initViewModels: function(panelModel) {
    this._log = QuerypointPanel.Log.initialize();
    this._scrubber = QuerypointPanel.LogScrubber.initialize(this._log, panelModel.scrubber);
    this._buffersStatusBar = QuerypointPanel.BuffersStatusBar.initialize();
    this._editors = QuerypointPanel.Editors.initialize(panelModel.buffers, this._buffersStatusBar);
    var openURLs = panelModel.buffers.openURLs.slice(0);
    panelModel.buffers.openURLs = [];  // create an list next time we save
    openURLs.forEach(this._openURL.bind(this));
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
    QuerypointModel.Storage.recall(
      function(model) {
        panel._restore(model);
      },
      function() {
        panel._restore(new QuerypointModel.PanelModel(panel.project.url));
      }
    );
  },

};
document.addEventListener('focus', function(event) {
  console.log("focus ", event.target);
}, true);
}());
