// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPCompiler = (function() {
  'use strict';
  
  var ProgramTransformer = traceur.codegeneration.ProgramTransformer;
  var Parser = traceur.syntax.Parser;

  var ModuleAnalyzer = traceur.semantics.ModuleAnalyzer;
  var Project = traceur.semantics.symbols.Project;
  
  function QPCompiler(reporter, opt_options) {
    this.reporter_ = reporter;
    
    traceur.options.es6 = false;
    traceur.options.harmony = false;
    traceur.options.experimental = false;
    
    if (opt_options) {
      traceur.options.es6 = !!opt_options.es6;
      traceur.options.harmony = !!opt_options.harmony;
      traceur.options.experimental = !!opt_options.experimental;
    }
  }

  QPCompiler.prototype = {

    compile: function(project) {
      this.parse(project);
      if (!this.reporter_.hadError()) {
        this.analyze(project);
        if (!this.reporter_.hadError()) {
          return this.transform(project);
        }
       }
    },

    parse: function(project) {
      project.getSourceFiles().forEach(function (file) {
        project.setParseTree(file, new Parser(this.reporter_, file).parseProgram(true));
      }.bind(this));
    },

    analyze: function(project) {
      var analyzer = new ModuleAnalyzer(this.reporter_, project);
      analyzer.analyze();
    },

    transform: function(project) {
      return ProgramTransformer.transform(this.reporter_, project);
    },


  };

  return QPCompiler
}());
