// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// ViewModel for project/page
//  

(function(){
  
  ko.extenders.syncArray = function(target, array) {
    target.subscribe(function(newValue){
      console.log("syncArray ", newValue);
      array = newValue;
    });
    return target;
  }

/**
 * @param panel {ExtensionPanel} devtools panel
 * @param panel_window {Window} the content window of the extension panel
 */

QuerypointPanel.Panel = function (extensionPanel, panel_window, page, project) {
  this.extensionPanel = extensionPanel;
  this.panel_window = panel_window;
  this.document = panel_window.document;
  this.page = page;
  this.project = project;

  var logElement = document.querySelector('.logView');
  var logScrubberElement = document.querySelector('.logScrubber');

  this.logScrubber = QuerypointPanel.LogScrubber.initialize(logElement);
  this._log = QuerypointPanel.Log.initialize(this.project, this.logScrubber);
  this.logViewModel = QuerypointPanel.LogViewModel.initialize(this._log, this.logScrubber);

  ko.applyBindings(this.logScrubber, logScrubberElement);
  ko.applyBindings(this, logElement);

  // Active queries are synced back to the project
  this.tracequeries = ko.observableArray().extend({syncArray: this.project.querypoints.tracequeries});

  this.fileViews = document.querySelector('.fileViews');
  this.primaryFileView = this.fileViews.querySelector('.fileView');

  // We view the page through 'files'
  this.fileViewModels = ko.observableArray([new QuerypointPanel.FileViewModel(this.primaryFileView, this)]);

  this.fileEditor = this.document.querySelector('.fileEditor');
  this._initModel();
  this._onResize();  // set initial sizes
  
  ko.applyBindings(this, this.fileViews);
}

QuerypointPanel.Panel.debug = false;

QuerypointPanel.Panel.prototype = {
  onShown: function() {
    this._isShowing = true;
    this.keybindings.enter();
  },

  onHidden: function() {
    this.keybindings.exit();
    this._isShowing = false;
  },

  showPrimaryFileView: function(editor) {
    var sourceFile = this.project.getFile(editor.name);  
    if (sourceFile) {
      var tree = this.project.getParseTree(sourceFile);
      this.fileViewModels()[0].setModel(editor, sourceFile, tree);
    } else {
      this.fileViewModels()[0].setModel(editor);
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

  _openURL: function(url) {
    var foundResource = this.page.resources.some(function(resource){
        if (resource.url) this._openResourceAndRefresh(resource);
    }.bind(this));
    if (!foundResource) {
      var sourceFile = this.project.getFile(url);
      if (sourceFile) {
        this.openPrimaryFileView(sourceFile);
      } 
    }
  },

  _openResourceAndRefresh: function(resource, item) {
    var view = this.fileViews.querySelector(".fileEditor");
    return this._openResource(view, resource, item, this.showPrimaryFileView.bind(this));
  },
  
  _openResource: function(fileEditorView, resource, item, onShown) {
    resource.getContent(function(content, encoding) {
      this._editors.openEditorForContent(
        fileEditorView, 
        resource.url, 
        content,
        this.showPrimaryFileView.bind(this), 
        onShown
      );
    }.bind(this));
  },
  
  openPrimaryFileView: function(sourceFile) {
    var view = this.fileViews.querySelector(".fileEditor");
    this._openSourceFile(view, sourceFile, this.showPrimaryFileView.bind(this));
  },
  
  _openSourceFile: function(fileEditorView, sourceFile, onShown) {
    this._editors.openEditorForContent(
      fileEditorView, 
      sourceFile.name, 
      sourceFile.contents,
      this.showPrimaryFileView.bind(this),
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
      var names = {};
      this.project.getSourceFiles().forEach(function(sourceFile){
        names[sourceFile.name] = sourceFile;
        uriItems.appendItem('open: '+sourceFile.name, this.openPrimaryFileView.bind(this, sourceFile));
      }.bind(this));
      this.page.resources.forEach(function(resource, index) {
        if (!names.hasOwnProperty(resource.url))
          uriItems.appendItem('open: '+resource.url, this._openResourceAndRefresh.bind(this, resource));
      }.bind(this));
      uriItems.selectItem();
      return false;
    },
    
    show: function(url) {
      console.error("TODO");
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
   // this._setHeight(this._setWidth());
  },
  
  _setWidth: function() {
    var fileViews = this.document.querySelector('.fileViews'); 
    var availableWidth = document.body.offsetWidth;
    var cols = fileViews.children;
    var width = availableWidth - (availableWidth / 1.618);
    for (var i = 0; i < cols.length - 1; i++) {
      cols[i].style.width = width  + 'px';
      availableWidth = availableWidth - width;
    }
    cols[cols.length - 1].style.width = availableWidth + 'px';
    return availableWidth;
  },
  
  _setHeight: function(width) {
    var fileViews = this.document.querySelector('.fileViews'); 
    var availableHeight = fileViews.parentElement.offsetHeight;
    var rows = fileViews.parentElement.children;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.classList.contains('fileViews'))
        continue;
      if (QuerypointPanel.Panel.debug)
        console.log("availableHeight: "+availableHeight+" minus "+row.offsetHeight+" = "+(availableHeight - row.offsetHeight), row);
      availableHeight = availableHeight - row.offsetHeight;
    }
    fileViews.style.height = availableHeight + 'px';
    var cols = fileViews.children;
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      col.style.height = availableHeight + 'px';
    }
    this._editors.resize(width, availableHeight);
  },
  
  _initMouse: function() {
    this.document.addEventListener('mousedown', this._onClickPanel.bind(this));
    this.panel_window.addEventListener('resize', this._onResize.bind(this));
    
    var panel = this;
    $(".focusBlock .hoverDoor").live("click", function(jQueryEvent) {
      console.log("Click ", jQueryEvent.target);
      panel._operateDoor($(this));
    });
    /*$(".hoverDoor span").mouseover(function(jQueryEvent){
      panel._operateDoor($(this));  
    });
    */
  },
  
  _operateDoor: function(jQ) {
      var closer = jQ[0];
      var closee = jQ.closest('.hoverDoorChannel')[0].parentElement; 
      if (closer.classList.contains('hoverCloser')) {
        closee.classList.add('closed');
      } else {
        closee.classList.remove('closed');
      }
  },
  
  _initEditors: function(panelModel) {
    this._buffersStatusBar = QuerypointPanel.BuffersStatusBar.initialize();
    this._editors = QuerypointPanel.Editors.initialize(panelModel.buffers, this._buffersStatusBar, this.commands);
    
    var lastURL = panelModel.buffers.openURLs.pop();
    panelModel.buffers.openURLs = [];  // create an list next time we save
  //  this._openURL(lastURL);
  },

  _restore: function(panelModel) {  
    this._initKeys();
    this._initMouse();
    this.document.querySelector('.panelInitialization').style.display = 'none';
    console.log("restore", panelModel);
    this._initEditors(panelModel);
    this.project.compile(function() {
      this.commands.selectFile.call(this);  
    }.bind(this));
  },

  _initModel: function() {
    var panel = this;
    // TODO replace this with ko.mapping plugin
    QuerypointModel.Storage.recall(
      function onSuccess(model) {
        panel._restore(model);
      },
      function onError() {
        panel._restore(new QuerypointModel.PanelModel(panel.project.url));
      }
    );
  },

};
document.addEventListener('focus', function(event) {
  console.log("focus ", event.target);
}, true);
}());
