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
  var logElement = document.querySelector('.logView');
  var logScrubberElement = document.querySelector('.overviewLog');
  var loadElement = document.querySelector('.loadList');

  this.logScrubber = QuerypointPanel.LogScrubber.initialize(logElement);
  this._log = QuerypointPanel.Log.initialize(this.project, this.logScrubber);
  this.logViewModel = QuerypointPanel.LogViewModel.initialize(this._log, this.logScrubber);

  this.allMessages = ko.computed( function(){
    var currentLoad = panel.logScrubber.showLoad();
    var joinMessages = currentLoad.messages || [];
    var maxMessages = document.querySelector('.logScrubber').offsetWidth-30;

    if (currentLoad.load == '-') return joinMessages;
    if(joinMessages.length < maxMessages){
        var borderWidth = Math.floor(maxMessages / joinMessages.length);
        if(borderWidth > 10) borderWidth = 10;
        borderWidth = borderWidth + 'px';
        setTimeout(function(){
            var events = document.querySelectorAll('.eventIndicator');
            for(var i = 0; i < events.length; i++){
                events[i].style.borderWidth = borderWidth;
            }
        },5);
        return joinMessages;
    }

    var perPixel = joinMessages.length / maxMessages;
    var last = 0, next = 0;
    var showMessages=[];
    var hasError, hasTurn, hasWarn, lastTurn;

    while(next != joinMessages.length){
        if(!hasTurn){
            hasError = hasTurn = hasWarn = false;
        }else{
            hasTurn = false;
        }
        if(last + perPixel > joinMessages.length) last = joinMessages.length; else last = last + perPixel;
        for(; next < last;next++){
            var severity = joinMessages[next].severity;
            if(severity == 'turn') hasTurn = true;
            if(severity == 'warn') hasWarn = true;
            if(severity == 'error') hasError = true;
        }
        lastTurn = joinMessages[next-1].turn;
        showMessages.push({severity: hasTurn ? 'turn' : hasWarn ? 'warn' : hasError ? 'error' : 'log', turn:lastTurn, scroll: joinMessages[next-1].scroll });
    }

    return showMessages;
  }).extend({throttle: 30});
  var dropDown = document.querySelector('.dropDown');

  ko.applyBindings(this.logScrubber, dropDown);
  ko.applyBindings(this.logScrubber, loadElement);
  ko.applyBindings(this, logScrubberElement);
  ko.applyBindings(this, logElement);

  var currentLoad = document.querySelector('.currentLoad');
  var nextLoad = document.querySelector('.nextLoad');

  this.showLoad = ko.computed( function(){
      return panel.logScrubber.showLoad().load;
  });
  this.showNext = ko.computed( function(){
      if (panel.logScrubber.showLoad().load == '-' || panel.logScrubber.showLoad().load == panel._log.currentReload.load){
          nextLoad.onmousedown = null;
          return '-';
      }else{
          nextLoad.onmousedown = function(){
              var next = panel.logScrubber.showLoad().next;
              panel.logScrubber.showLoad(next);
          };
          return panel.logScrubber.showLoad().load+1;
      }
  });

  dropDown.onmouseout = function(){
      dropDown.style.display = 'none';
  }

  ko.applyBindings(this, currentLoad);
  ko.applyBindings(this, nextLoad);

  currentLoad.onmouseover = function(){
      dropDown.style.display = 'none';
      loadElement.style.display = 'block';
  }

  loadElement.onmouseout = function(event){
      var e = event.toElement || event.relatedTarget;
      while(e && e.parentNode && e.parentNode != window) {
        if (e.parentNode == this ||  e==this) {
            if(e.preventDefault) e.preventDefault();
            return false;
        }
        e = e.parentNode;
      }
      loadElement.style.display = 'none';
  }

  logElement.onmouseout = function(){
      dropDown.style.display = 'none';
      loadElement.style.display = 'none';
  };

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

  // Active queries are synced back to the project
  this.tracequeries = ko.observableArray().extend({
    runPage: this.project
  });
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
  this._initModel();
  this._onResize();  // set initial sizes
  
  ko.applyBindings(this, this.fileViews);

   $(".QPOutput").live("click", function(jQueryEvent) {
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

  // These methods are bound to |this| panel
  commands: {  // KeyBindings must be kept in sync

    // Open a dialog filled with file names for user selection
    //
    selectFile: function() {
      if (debug) console.log("QuerypointPanel.selectFile");
      var uriItems = new QuerypointPanel.URISelector(this.extensionPanel);
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

    // Open an editor to view information selected out of another editor
    // e.g. trace with refs to other files or call stack with refs to older frames
    openChainedEditor: function(url) {
      var linkTarget = this.linkTargetFromURL(url);
      var fileViewModel = this.getFileViewModelByName(linkTarget.name);
      if (fileViewModel) {
        var mark = fileViewModel.editor().showRegion(linkTarget.start, linkTarget.end);
        if (mark) {
          var clearMark = function(event) {
            mark.clear();
            if (debug) console.log("cleared mark because of mouseout on ", event.target);
            $(this.document).off('mouseout', clearMark);
          }
          $(this.document).on('mouseout', clearMark);
        }
      } else {
        var sourceFile = this.project.getFile(linkTarget.name);
        if (sourceFile) {
          console.error("QuerypointPanel.onShown");   
        } else {
          console.error("QuerypointPanel.openChainedEditor but no sourcefile!");
        }
      }
    },

    saveFile: function() {
      return this._editors.saveFile();
    },
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

    // rebind this.commands to create a subset of methods callable via user keys
    Object.keys(this.commands).forEach(function(key){
      this.commands[key] = this.commands[key].bind(this);
    }.bind(this));
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
    this._buffersStatusBar = QuerypointPanel.BuffersStatusBar.initialize(this);
    this._editors = QuerypointPanel.Editors.initialize(panelModel.buffers, this._buffersStatusBar, this.commands);
    
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
    this.project.compile(function(compileResult) {
     // TODO copy the ParseTrees before ... this.project.runInWebPage(compileResult);
      this.commands.selectFile.call(this);  
    }.bind(this));
    window.onbeforeunload = function(event) {
      QuerypointModel.Storage.store(panelModel);
      return undefined;
    };
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
      var logFloat = document.querySelector('.floaty');
      elem.scroll = logFloat.scrollHeight;
      if (parseInt(elem.scroll,10) < 210) elem.scroll = '0px';
      logFloat.scrollTop = logFloat.scrollHeight;
  },

  focusLog: function (elem) {
    if(!elem.scroll) return;
    var logFloat = document.querySelector('.floaty');
    logFloat.scrollTop = elem.scroll - logFloat.offsetHeight/2;
  },

  turnInfo: function(){
      if (debug) console.log('QuerypointPanel.turnInfo: ', arguments);
      var dropDown = document.querySelector('.dropDown');
      var loadElement = document.querySelector('.loadList');
      dropDown.style.display = 'block';
      loadElement.style.display = 'none';
      QuerypointPanel.LogScrubber.showTurn(this.turn);
  },
  notShown: function(){
      var a=1;
      console.error(arguments);
      return false;
  },
  tooltip: function(turn){
    return this._log.currentTurn.event;
  }
  
};

}());
