// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// A traceur RemoteWebPageProject that adds tracing to every compile

function QPProject(url) {
  RemoteWebPageProject.call(this, url);
  // FIXME override parent __getter__ for reporter
  this.reporter_ = new QPErrorReporter();

  this.compiler_ = new QPCompiler(this.reporter, {}); // TODO traceur options
      
  this.querypoints = Querypoint.Querypoints.initialize();

}

QPProject.prototype = Object.create(RemoteWebPageProject.prototype);
      
function generateFileName(location) {
    return location ? location.start.source.name : "internal";
};

QPProject.prototype.generateSourceFromTrees = function(trees) {
    var identifierGenerator = new traceur.codegeneration.UniqueIdentifierGenerator();

  return trees.keys().map(function(file) {
    var tree = trees.get(file);  

    Querypoint.ScopeAttacher.attachScopes(this.reporter_, tree, Querypoint.globalSymbols);

    // TODO Only trees subject to tracing need linearize 
    var transformer = new Querypoint.LinearizeTransformer(identifierGenerator, generateFileName);
    tree = transformer.transformAny(tree);
    
    // TODO only trees that the developer *might* debug needs dynamic hooks
    var preambleTransformer = new Querypoint.QPFunctionPreambleTransformer(generateFileName);
    tree = preambleTransformer.transformAny(tree);

    file.generatedFileName = file.name + ".js";
    var writer = new QPTreeWriter(file.generatedFileName, this.querypoints.tracequeries());
    file = writer.generateSource(file, tree);

    return file;
  }.bind(this));
}

QPProject.prototype.startRuntime = function() {
  function startRuntime() {  // runs in web page
    window.__qp.fireLoad();
  }
  function onRuntimeStarted(results) {
    console.log("QP runtime called fireLoad() got "+results);
  }
  chrome.devtools.inspectedWindow.eval(this.evalStringify(startRuntime, []), onRuntimeStarted);
}

QPProject.prototype.runInWebPage = function(trees) {
  RemoteWebPageProject.prototype.runInWebPage.call(this, trees);
  this.startRuntime();
}

QPProject.prototype.isGeneratedFile = function(name){
  return Object.keys(this.sourceFiles_).some(function(key) {
    return (this.sourceFiles_[key].generatedFileName === name);
  }.bind(this));
}

QPProject.prototype.treeFinder = function() {
  return Querypoint.FindInTree;
}

// Need class level access for bootstrap, see QuerypointDevtools.js
QPProject.reload = function() {
  function transcode(str) {
    console.log("transcode saw ", str);
    return  "// ignored some JavaScript, Hah!";
  }

  var reloadOptions = {
    ignoreCache: true, 
    injectedScript:  '(' + Querypoint.runtime + '());', 
    preprocessingScript: '(' + transcode + ')'
  };
  chrome.devtools.inspectedWindow.reload(reloadOptions);
}

QPProject.prototype.reload = function() {
  QPProject.reload();
  return ++this.numberOfReloads;
}
