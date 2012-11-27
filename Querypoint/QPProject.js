// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// A traceur RemoteWebPageProject that adds tracing to every compile

(function(){

  function QPProject(url, loads) {
    RemoteWebPageProject.call(this, url);
    this.uid = loads;
    this.numberOfReloads = 0; 

    // FIXME override parent __getter__ for reporter
    this.reporter_ = new QPErrorReporter();

    this.compiler_ = new QPCompiler(this.reporter, {}); // TODO traceur options
        
    this.querypoints = Querypoint.Querypoints.initialize();
    this.runtime = Querypoint.QPRuntime.initialize();
    console.log(loads + " QPProject created for "+url);
  }

  // Need class level access for bootstrap, see QuerypointDevtools.js
  QPProject.reload = function(numberOfReloads) {
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
  }

  QPProject.prototype = {
    __proto__: RemoteWebPageProject.prototype,
        

    compile: function(onAllCompiled) {
      function onScriptsReady() {
        this.compiler_.compile(this);
        onAllCompiled(); 
      }
      this.addFilesFromScriptElements(this.remoteScripts, onScriptsReady.bind(this));
    },

    generateSourceFromTrees: function(trees) {
      if (!trees)
        return [];

      Querypoint.QPRuntime.initialize();

      return trees.keys().map(function(file) {
        var tree = trees.get(file);  

        // TODO only trees that the developer *might* debug needs dynamic hooks
        var preambleTransformer = new Querypoint.QPFunctionPreambleTransformer(generateFileName);
        tree = preambleTransformer.transformAny(tree);

        this.querypoints.tracequeries.forEach(function(tq) {
          tree = tq.transformParseTree(tree);
        });

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

    runInWebPage: function(trees) {
      RemoteWebPageProject.prototype.runInWebPage.call(this, trees);
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
        
      QPProject.reload(++this.numberOfReloads);
      return this.numberOfReloads;
    },
    
    turnEnds: function(turnNumber) {
        debugger;
    },
    
  };

  window.Querypoint = window.Querypoint || {};
  window.Querypoint.QPProject = QPProject;

}());
