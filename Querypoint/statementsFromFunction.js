// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

(function(){
  
  window.Querypoint = window.Querypoint || {};
  
  var errorReporter = {
    errors: [],
    reportError: function(position, message) {
      console.error(message + ', ' + position);
      this.errors.push(message);
    },
    hadError: function() {
        return this.errors.length > 0;
    }
  };
  
  function StatementExtractor() {
    this.statements = [];
  }

  StatementExtractor.prototype = Object.create(traceur.codeGeneration.ParseTreeTransformer);

  StatementExtractor.prototype.transformFunctionBody = function(tree) {
    this.statements = tree;
    return null;
  };

  var statementExtractor = new StatementExtractor();

  Querypoint.statementsFromFunction = function(jsFunction) {
    var source = jsFunction.toString();
    var sourceFile = traceur.syntax.SourceFile("fragment", source);
    var scanner = traceur.syntax.Scanner(errorReporter, sourceFile);
    var parser = traceur.syntax.Parser(errorReporter, scanner);
    var tree = parser.parseProgram();
    statementExtractor.transform(tree);
    return statementExtractor.statements;
  }

}());