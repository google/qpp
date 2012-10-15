// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

(function(){
  
  window.Querypoint = window.Querypoint || {};
  
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var createMemberExpression = ParseTreeFactory.createMemberExpression;
  var createMemberLookupExpression = ParseTreeFactory.createMemberLookupExpression;
  var createPropertyNameAssignment = ParseTreeFactory.createPropertyNameAssignment;
  var createStringLiteral = ParseTreeFactory.createStringLiteral;
  var createAssignmentStatement = ParseTreeFactory.createAssignmentStatement;
  var createArrayLiteralExpression = ParseTreeFactory.createArrayLiteralExpression;
  var createObjectLiteralExpression = ParseTreeFactory.createObjectLiteralExpression;

  var Program = traceur.syntax.trees.Program;

  var QPFunctionPreambleTransformer = Querypoint.QPFunctionPreambleTransformer = function(generateFileName) {
    this.generateFileName = generateFileName;
    this.functionLocations = [];       // tree.location for all functions parsed 
  }

  QPFunctionPreambleTransformer.prototype = Object.create(traceur.codegeneration.ParseTreeTransformer.prototype);

  QPFunctionPreambleTransformer.prototype.transformFunctionBody = function(tree) {
        // We'll use these to build __qp.functions objects in _createInitializationStatements
        this.functionLocations.push(tree.location);
        // TODO preamble transform
        return tree;
  }

  QPFunctionPreambleTransformer.prototype.generateFunctionId = function(location) {
    return location.start.offset + '';
  }

  QPFunctionPreambleTransformer.prototype._createFileNameStatement = function(tree) {
    // window.__qp.functions["<filename>"] = {};
    var statement = 
      createAssignmentStatement(
        createMemberLookupExpression(
          createMemberExpression('window', '__qp', 'functions'),
          createStringLiteral(this.generateFileName(tree.location))
        ),
        createObjectLiteralExpression([])     
      )
    return statement;
  }
  
  QPFunctionPreambleTransformer.prototype._createInitializationStatements = function(tree) {
    var statements = [];
    this.functionLocations.forEach(function(location) {
      // window.__qp.functions["<file_name>"]["<functionId>"] = [];
      statements.push(
          createAssignmentStatement(
            createMemberLookupExpression(
              createMemberLookupExpression(
                createMemberExpression('window', '__qp', 'functions'),
                createStringLiteral(this.generateFileName(location))
              ),
              createStringLiteral(this.generateFunctionId(location))
            ),
            createArrayLiteralExpression([])

          )
        );
    }.bind(this));
    return statements;
  }

  QPFunctionPreambleTransformer.prototype.transformProgram = function(tree) {
    this.functionLocations.push(tree.location);  // the top-level function for this compilation unit
    var elements = this.transformList(tree.programElements);
    var filenameInitializer = this._createFileNameStatement(tree);
    var initializationStatements = this._createInitializationStatements(tree);
    elements = [filenameInitializer].concat(initializationStatements).concat(elements);
    return new Program(tree.location, elements);
  }


}());
