// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// ViewModel for project/page
//  

(function(){

  "use strict";

  var debug = DebugLogger.register('QuerypointPanel', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });
  
  ko.extenders.syncArray = function(target, array) {
    target.subscribe(function(newValue){
      if (debug) console.log("QuerypointPanel syncArray ", newValue);
      array = newValue;
    });
    return target;
  }
  
  ko.extenders.runPage = function(target, project) {
    target.subscribe(function(newValue){
      project.querypoints.tracequeries = newValue;
      project.run();
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
  var panel = this;

  this.clear(); // We don't recreate the panel HTML so we have to cleanup.

  // Active queries are synced back to the project
  this.tracequeries = ko.observableArray().extend({
    runPage: this.project
  });

  var logElement = document.querySelector('.logView');
  var logScrubberElement = document.querySelector('.logScrubber');
  var loadElement = document.querySelector('.loadList');
  var dropDown = document.querySelector('.eventTurn');
  var currentLoad = document.querySelector('.currentLoad');
  var nextLoad = document.querySelector('.nextLoad');
  var recordButton = document.querySelector('.recordIndicator');
  var playButton = document.querySelector('.recordMarker');

  this.logScrubber = QuerypointPanel.LogScrubber.initialize(logElement, project, this.tracequeries);
  this._log = QuerypointPanel.Log.initialize(this.project, this.logScrubber);
  this.logViewModel = QuerypointPanel.LogViewModel.initialize(this._log, this.logScrubber);

  ko.applyBindings(this.logScrubber , logScrubberElement);
  ko.applyBindings(this, logElement);

  // Set max height of trace trable depend on window height
  var traceBody = document.querySelector('.traceBody');
  traceBody.style.maxHeight = traceBodySpace() + 'px';

  function traceBodySpace(){
      var hoverDoorTarget = document.querySelector('.hoverDoorTarget');
      var tokenView = 110; // size depends on selected token
      var explainTokenPanel = document.querySelector('.explainTokenPanel');
      var queryView = document.querySelector('.queryView');
      return hoverDoorTarget.offsetHeight - tokenView - explainTokenPanel.offsetHeight - queryView.offsetHeight;
  }

  window.onresize = function(){
    var traceBody = document.querySelector('.traceBody');
    traceBody.style.maxHeight = traceBodySpace() + 'px';
    panel.logScrubber.showLoad.valueHasMutated();
  }

  // Turns in the current load are synced back to the project
  this.turns = ko.observableArray().extend({syncArray: this.project.turns});
  
  this.currentTurn = ko.computed(function() {
    var turnEnded = panel.logScrubber.turnEnded();
    return turnEnded;
  });


  this.fileViews = document.querySelector('.fileViews');
  this.primaryFileView = this.fileViews.querySelector('.fileView');

  // We view the page through 'files'
  this.fileViewModels = ko.observableArray([new QuerypointPanel.FileViewModel(this.primaryFileView, this)]);

  this.fileEditor = this.document.querySelector('.fileEditor');

  this.commands = new QuerypointPanel.Commands(this);
  this._initModel();
  this._onResize();  // set initial sizes
  
  ko.applyBindings(this, this.fileViews);

   $(".panel").live("click", function(jQueryEvent) {
        jQueryEvent.target.focus();
        var url = jQueryEvent.target.getAttribute('data-url');
        if (url) {
          panel.commands.openChainedEditor(url);
        } // else the user did not click on something interesting.   
    });
}

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
    var tree = this.project.getTreeByName(editor.name);  
    if (tree) {
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
  
  urlFromTreeLocation: function(location) {
    return location.start.source.name + '?start=' + location.start.offset + '&end=' + location.end.offset + '&';
  },
  
  linkTargetFromURL: function(url) {
    var parsedURI = parseUri(url);
    if (parsedURI) {
      var name = url.split('?')[0];
      return {
        name: name, 
        start: parseInt(parsedURI.queryKey.start, 10),
        end: parseInt(parsedURI.queryKey.end, 10),
      };
    } else {
      console.error("linkTargetFromURL failed for "+url)
    }
  },

  getFileViewModelByName: function(name) {
    var found; 
    this.fileViewModels().some(function(fileViewModel) {
      if(fileViewModel.editor().name === name)
        return found = fileViewModel;
    });
    return found;
  },

  _initKeys: function() {
    this.keybindings = new KeyBindings(this.panel_window);
    this.keybindings.apply(this.commands);
  },

  _openContextMenu: function(event) {
    console.error("_openContextMenu", event);
  },

  _onClickPanel: function(event) {
    if (event.button === 2) {
      this._openContextMenu(event);
    } else {
      if (event.target.classList.contains('QPOutput')) {
        //this.refresh();
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
      if (debug)
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
    $(".hoverDoorTarget .hoverDoor").live("click", function(jQueryEvent) {
      if (debug) console.log("Click ", jQueryEvent.target);
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
    this._statusBar = QuerypointPanel.StatusBar.initialize(this);
    this._editors = QuerypointPanel.Editors.initialize(panelModel.buffers, this._statusBar, this.commands);
    
    var lastURL = panelModel.buffers.openURLs.pop();
    panelModel.buffers.openURLs = [];  // create an list next time we save
  //  this._openURL(lastURL);
  },

  _restore: function(panelModel) {  
    this._initKeys();
    this._initMouse();
    this.document.querySelector('.panelInitialization').style.display = 'none';
    if (debug) console.log("restore", panelModel);
    this._initEditors(panelModel);
    QuerypointPanel.OnPanelOpen.initialize(this);
    // compile to support UI
    this.project.getPageScripts(function() {
      this.project.compile(function(compileResult) {
       // TODO copy the ParseTrees before ... this.project.runInWebPage(compileResult);
        this.commands.selectFile.call(this);  
      }.bind(this));      
    }.bind(this));
    window.onbeforeunload = this.save.bind(this);
    this._panelModel = panelModel; // TODO update 
  },

  save: function(event) {
    QuerypointModel.Storage.store(this._panelModel);
    return undefined;
  },

  pageWasExternallyReloaded: function() {
    QuerypointPanel.OnPanelOpen.open();
  },

  _initModel: function() {
    var panel = this;
    // TODO replace this with ko.mapping plugin
    QuerypointModel.Storage.recall(
      function onSuccess(model) {
        panel._restore(model);
      },
      function onError(exc) {
        console.error("QuerypointModel recall failed " + exc, exc);
        panel._restore(new QuerypointModel.PanelModel(panel.project.url));
      }
    );
  },

  setScroll: function(node,elem) {
      var logFloat = document.querySelector('.logContainer');
      elem.scroll = node[1];
      elem.scroll.scrollIntoView(false);
  },

  tooltip: function(turn){
    return this._log.currentTurn.event;
  },

  clear: function() {
    // most of the clean up is done by knockout.
    var mirrors = document.querySelectorAll('.fileEditor > .CodeMirror');
    for (var i = 0; i < mirrors.length; i++) {
      var mirror = mirrors[i];
      mirror.parentElement.removeChild(mirror);
    }
  }
};

}());
