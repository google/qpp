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
  var createVariableStatement = ParseTreeFactory.createVariableStatement;
  var createVariableDeclarationList = ParseTreeFactory.createVariableDeclarationList;
  var createIfStatement = ParseTreeFactory.createIfStatement;
  var createCallExpression = ParseTreeFactory.createCallExpression;
  var createArgumentList = ParseTreeFactory.createArgumentList;
  var createReturnStatement = ParseTreeFactory.createReturnStatement;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;
 
  var PredefinedName = traceur.syntax.PredefinedName;
  var TokenType = traceur.syntax.TokenType;
  var Program = traceur.syntax.trees.Program;

  var QPFunctionPreambleTransformer = Querypoint.QPFunctionPreambleTransformer = function(generateFileName) {
    this.generateFileName = generateFileName;
    this.functionLocations = [];       // tree.location for all functions parsed 
  }

  QPFunctionPreambleTransformer.prototype = Object.create(traceur.codegeneration.ParseTreeTransformer.prototype);

  var QP_FUNCTION = '__qp_function';

  QPFunctionPreambleTransformer.prototype._createFileAccessExpression = function(location) {
    // window.__qp.functions["<file_name>"]
    return createMemberLookupExpression(
      createMemberExpression('window', '__qp', 'functions'),
      createStringLiteral(this.generateFileName(location))
    );
  }

  QPFunctionPreambleTransformer.prototype._createFunctionAccessExpression = function(location) {
    // window.__qp.functions["<file_name>"]["<functionId>"] 
    return createMemberLookupExpression(
      this._createFileAccessExpression(location),
      createStringLiteral(this.generateFunctionId(location))
    );
  }

  QPFunctionPreambleTransformer.prototype.generateFunctionId = function(location) {
    return location.start.offset;
  }

  QPFunctionPreambleTransformer.prototype._createFileNameStatement = function(tree) {
    // window.__qp.functions["<filename>"] = {};
    var statement = 
      createAssignmentStatement(
        this._createFileAccessExpression(tree.location),
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
            this._createFunctionAccessExpression(location),
            createArrayLiteralExpression([])
          )
        );
    }.bind(this));
    return statements;
  }


  QPFunctionPreambleTransformer.prototype._createVarFunctionStatement = function(location) {
    // var __qp_function = window.__qp.functions["<file_name>"]["<functionId>"];
    return createVariableStatement(
      createVariableDeclarationList(
        TokenType.VAR, 
        QP_FUNCTION, 
        this._createFunctionAccessExpression(location)
      )
    );
  }

  QPFunctionPreambleTransformer.prototype._createIfFunctionCallStatement = function() {
    // if (__qp_function.redirect) return __qp_function.redirect.apply(this, arguments);
    return   createIfStatement(
      createMemberExpression(QP_FUNCTION, 'redirect'),
      createReturnStatement(
        createCallExpression(
          createMemberExpression(QP_FUNCTION, 'redirect', 'apply'),
          createArgumentList(
            createIdentifierExpression('this'), 
            createIdentifierExpression('arguments')
          )
        )
      )
    );
  }

  QPFunctionPreambleTransformer.prototype._createPreambleStatements = function(tree) {
    var var__qp_functionStatement = this._createVarFunctionStatement(tree.location);
    var if__qp_functionCallStatement = this._createIfFunctionCallStatement(tree.location);
    return [var__qp_functionStatement, if__qp_functionCallStatement];
  }

  QPFunctionPreambleTransformer.prototype.transformFunctionBody = function(tree) {
    // We'll use these to build __qp.functions objects in _createInitializationStatements
    this.functionLocations.push(tree.location);

    tree.statements = this._createPreambleStatements(tree).concat(tree.statements);
    return tree;
  }

  QPFunctionPreambleTransformer.prototype.transformProgram = function(tree) {
    var fileFunctionLocation = {
        start: {source: tree.location.start.source, offset: 'file'}, 
        end: {source: tree.location.start.source, offset: 'file'}
    };
    this.functionLocations.push(fileFunctionLocation);  // the top-level function for this compilation unit
    var elements = this.transformList(tree.programElements);
    var prefix = [this._createFileNameStatement(tree)].concat(this._createInitializationStatements(tree));
    prefix.push(this._createVarFunctionStatement(fileFunctionLocation));
    elements = prefix.concat(elements);
    return new Program(tree.location, elements);
  }


}());
