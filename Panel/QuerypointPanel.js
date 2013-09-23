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

QuerypointPanel.Panel = function (extensionPanel, panel_window, project) {
  this.extensionPanel = extensionPanel;
  this.panel_window = panel_window;
  this.project = project;
  var panel = this;

  this.clear(); // We don't recreate the panel HTML so we have to cleanup.

  // Active queries are synced back to the project
  this.tracequeries = ko.observableArray().extend({
    runPage: this.project
  });

  var logView = document.querySelector('.logView');
  var dropDown = document.querySelector('.turnView');

  this.sessionViewModel = QuerypointPanel.SessionViewModel.initialize(project, this.tracequeries);

  // Turns in the current load are synced back to the project
  this.turns = ko.observableArray().extend({syncArray: this.project.turns});

  this.commands = new QuerypointPanel.Commands(this);
  this._initModel();

   $(".panel").live("click", function(jQueryEvent) {
      var target = jQueryEvent.target;
      target.focus();
      var url = target.getAttribute('data-url');
      if (url) {
        var fileView = target;
        while(fileView && !fileView.classList.contains('fileView'))
          fileView = fileView.parentElement;
        panel.commands.openChainedEditor(url, fileView);
        target.dispatchEvent(new CustomEvent('navigatedFrom', {bubbles: true})); 
      } // else the user did not click on something interesting.   
    });
}

QuerypointPanel.Panel.prototype = {
  connect: function() {
    this.sessionViewModel.connect();
  },
  disconnect: function() {
    this.sessionViewModel.disconnect();
  },
  onShown: function() {
    this._isShowing = true;
    this.keybindings.enter();
  },

  onHidden: function() {
    this.keybindings.exit();
    this._isShowing = false;
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
  
  urlFromTreeLocation: function(location) {
    return location.start.source.name + '?start=' + location.start.offset + '&end=' + location.end.offset + '&';
  },

  openSourceFileView: function(sourceFile) {
    this._fileChainViewModel.openSourceFileView(sourceFile);
  },

  openResourceView: function(resource) {
    this._fileChainViewModel.openResourceView(resource);
  },

  resetChain: function(fileViewModel) {
    this._fileChainViewModel.showFileViewModel(fileViewModel);
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
  
  _initMouse: function() {
    document.addEventListener('mousedown', this._onClickPanel.bind(this));
   
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
    this._statusBar = QuerypointPanel.StatusBar.initialize(this, this.sessionViewModel);
    this._editors = QuerypointPanel.Editors.initialize(panelModel.buffers, this._statusBar, this.commands);
    QuerypointPanel.FileViewModel.initialize(this._editors, this);
    var workspaceElement = document.querySelector('.workSpace');
    this._fileChainViewModel = new QuerypointPanel.FileChainViewModel(workspaceElement, this);
    var lastURL = panelModel.buffers.openURLs.pop();
    panelModel.buffers.openURLs = [];  // create an list next time we save
  },

  _restore: function(panelModel) {  
    this._initKeys();
    this._initMouse();
    document.querySelector('.panelInitialization').style.display = 'none';
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

  pageWasReloaded: function(runtimeInstalled, runtimeInstalling) {
    this.sessionViewModel.pageWasReloaded(runtimeInstalled, runtimeInstalling);
    if (!runtimeInstalling)
      QuerypointPanel.OnPanelOpen.open(runtimeInstalled);
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
