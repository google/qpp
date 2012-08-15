// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPCompiler = (function() {
  'use strict';
  
  var ProgramTransformer = traceur.codegeneration.ProgramTransformer;
  var Parser = traceur.syntax.Parser;

  var ModuleAnalyzer = traceur.semantics.ModuleAnalyzer;
  var Project = traceur.semantics.symbols.Project;
  
  function QPCompiler(reporter, querypoints) {
    this.reporter_ = reporter;
    this.querypoints_ = querypoints;
    traceur.options.setFromObject({
      linearize: true,
      sourceMaps: true
    });
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

      analyzer = new QPAnalyzer(project, this.querypoints_);
      analyzer.analyze();
    },

    transform: function(project) {
      return ProgramTransformer.transform(this.reporter_, project);
    },


  };

  return QPCompiler
}());
