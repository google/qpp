// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';
  
  var Parser = traceur.syntax.Parser;
 
  function QPFileCompiler(reporter) {
    this.reporter_ = reporter;
    traceur.options.blockBinding = true;
  }
  
  QPFileCompiler.prototype = {
    
    compile: function(file) {
      var tree = this.parse(file);
      if (!this.reporter_.hadError()) {
          return this.analyze(tree);
      }
    },
    
    parse: function(file) {
      var tree = new Parser(this.reporter_, file).parseProgram(true);
      return tree;
    },
    
    analyze: function(tree) {
      Querypoint.ScopeAttacher.attachScopes(this.reporter_, tree, Querypoint.globalSymbols);
      return tree;
    },

    transformers: function(descriptors) {
      return descriptors.map(function(description){
        return new Querypoint[description.ctor](description.queryData);
      });
    },
    
    transform: function(tree, transformers) {
      transformers.forEach(function(transformer) {
        tree = transformer.transformTree(tree);
        // FIXME: Writing hasValueChangeTransform  onto tree is loser.
        if (tree.hasValueChangeTransform) QPFileCompiler.didValueChange = true;
        if (QPFileCompiler.didValueChange) tree.hasValueChangeTransform = true;
        console.assert(tree);
      });
      delete QPFileCompiler.didValueChange;
      return tree;
    },

    generateSource: function(generatedFileName, tree) {
      var writer = new QPTreeWriter(generatedFileName);
      return  writer.generateSource(tree);
    },

    generateSourceFromTree: function(tree, generatedFileName, descriptors) {
      tree = this.transform(tree, this.transformers(descriptors));
      return this.generateSource(generatedFileName, tree);
    },  
  };

  Querypoint.QPFileCompiler = QPFileCompiler
}());
