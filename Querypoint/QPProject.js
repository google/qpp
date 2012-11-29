// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// A traceur RemoteWebPageProject that adds tracing to every compile

(function(){


  function generateFileName(location) {
      return location ? location.start.source.name : "internal";
  };


  function QPProject(url, loads) {
    RemoteWebPageProject.call(this, url);

    this.numberOfReloads = loads; 

    // FIXME override parent __getter__ for reporter
    this.reporter_ = new QPErrorReporter();

    this.compiler_ = new QPCompiler(this.reporter, {}); // TODO traceur options
        
    this.querypoints = Querypoint.Querypoints.initialize();
    
    this.runtime = Querypoint.QPRuntime.initialize();

    this._onWebPageNavigated = this._onWebPageNavigated.bind(this);
    this._monitorReloads();
    
    console.log(loads + " QPProject created for "+url);
  }

  QPProject.prototype = {
    __proto__: RemoteWebPageProject.prototype,
        
    compile: function(onAllCompiled) {
      function onScriptsReady() {
        this.compiler_.compile(this);
        onAllCompiled(this._parseTrees); 
      }
      this.addFilesFromScriptElements(this.remoteScripts, onScriptsReady.bind(this));
    },

    // Called by runInWebPage
    generateSourceFromTrees: function(treeObjectMap) {
      if (!treeObjectMap)
        return [];

      Querypoint.QPRuntime.initialize();

      return treeObjectMap.keys().map(function(file) {
        var tree = treeObjectMap.get(file);  

        this.querypoints.tracequeries.forEach(function(tq) {
          tree = tq.transformParseTree(tree);
        });

        var preambleTransformer = new Querypoint.QPFunctionPreambleTransformer(generateFileName);
        tree = preambleTransformer.transformAny(tree);

        file.generatedFileName = file.name + ".js";
        var writer = new QPTreeWriter(file.generatedFileName);
        file = writer.generateSource(file, tree);

        return file;
      }.bind(this));
    },

    startRuntime: function() {
      function startRuntime() {  // runs in web page
        window.__qp.fireLoad();
      }
      function onRuntimeStarted(results) {
        console.log("QP runtime called fireLoad() got "+results);
      }
      chrome.devtools.inspectedWindow.eval(this.evalStringify(startRuntime, []), onRuntimeStarted);
    },

    runInWebPage: function(treeObjectMap) {
      // inject the tracing source
      RemoteWebPageProject.prototype.runInWebPage.call(this, treeObjectMap);
      this.startRuntime();
    },

    isGeneratedFile: function(name){
      return Object.keys(this.sourceFiles_).some(function(key) {
        return (this.sourceFiles_[key].generatedFileName === name);
      }.bind(this));
    },

    treeFinder: function() {
      return Querypoint.FindInTree;
    },

    reload: function() {    
      this.querypoints.tracequeries.forEach(function(tq) {
        Querypoint.QPRuntime.appendSource(tq.runtimeSource());
      });
      
      this._unmonitorReloads();
      var onNavigated = function(url) {
        chrome.devtools.network.onNavigated.removeListener(onNavigated);
        if (url !== this.url) {
          console.error("QPProject reload failed: url mismatch: " + url + '!==' + this.url);
        }
        this.runInWebPage(this.parseTrees_);
        this._monitorReloads();
      }.bind(this);
          
      chrome.devtools.network.onNavigated.addListener(onNavigated);
      
      this._reload(++this.numberOfReloads);
      
      return this.numberOfReloads;
    },
    
    _reload: function(numberOfReloads) {
      console.assert(typeof numberOfReloads === 'number');
      function transcode(str) {
        console.log("transcode saw ", str);
        return  "// ignored some JavaScript, Hah!";
      }

      Querypoint.QPRuntime.setReloadCounter(numberOfReloads);

      var reloadOptions = {
        ignoreCache: true, 
        injectedScript:  Querypoint.QPRuntime.runtimeSource(), 
        preprocessingScript: '(' + transcode + ')'
      };
      chrome.devtools.inspectedWindow.reload(reloadOptions);
    },
    
    _onWebPageNavigated: function(url) {
      if (url === this.url) {
        // a new project will be created by QuerypointDevtools.js
        return;
      } else {
        // User reloaded the page, so we are back to square one. TODO: offer to clear querypoints
        this.getPageScripts(function() {
          console.log("rescanned page for scripts");
        });
      }
    },
    
    _monitorReloads: function() {
      chrome.devtools.network.onNavigated.addListener(this._onWebPageNavigated);
    },
    
    _unmonitorReloads: function() {
      chrome.devtools.network.onNavigated.addListener(this._onWebPageNavigated);
    }
    
  };

  window.Querypoint = window.Querypoint || {};
  window.Querypoint.QPProject = QPProject;

}());
