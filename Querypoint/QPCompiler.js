// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPCompiler = (function() {
  'use strict';
  
  var ProgramTransformer = traceur.codegeneration.ProgramTransformer;
  var Parser = traceur.syntax.Parser;

  var ModuleAnalyzer = traceur.semantics.ModuleAnalyzer;
  var Project = traceur.semantics.symbols.Project;
  
  function QPCompiler(fileCompiler, opt_options) {
    this.fileCompiler_ = fileCompiler;
    
    traceur.options.reset(false);

    if (opt_options) {
      traceur.options.es6 = !!opt_options.es6;
      traceur.options.harmony = !!opt_options.harmony;
      traceur.options.experimental = !!opt_options.experimental;
    }
    traceur.options.blockBinding = true;  // https://github.com/google/traceur-compiler/issues/238
  }

  QPCompiler.prototype = {

    compile: function(project) {
      project.getSourceFiles().forEach(function (file) {
        project.setParseTree(file, this.fileCompiler_.compile(file));
      }.bind(this));
      return project;
    },

    parse: function(project) {
      project.getSourceFiles().forEach(function (file) {
        project.setParseTree(file, new Parser(project.reporter, file).parseProgram(true));
      }.bind(this));
      return project;
    },

    analyze: function(project) {
      var analyzer = new ModuleAnalyzer(project.reporter, project);
      analyzer.analyze();
      project.getSourceFiles().forEach(function(file){
        var tree = project.getParseTree(file);
        Querypoint.ScopeAttacher.attachScopes(project.reporter, tree, Querypoint.globalSymbols);  
      });
      return project;
    },

  };

  return QPCompiler
}());
