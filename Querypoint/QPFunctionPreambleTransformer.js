// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

(function(){
  
  'use strict';
  
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

  var QPFunctionPreambleTransformer = Querypoint.QPFunctionPreambleTransformer = function() {
    this.functionLocations = [];       // tree.location for all functions parsed
  }

  var QP_FUNCTION = '__qp_function';

  QPFunctionPreambleTransformer.prototype = {
    __proto__: traceur.codegeneration.ParseTreeTransformer.prototype,

    transformTree: function(tree) {
      return this.transformAny(tree);
    },

    _encodedSource: function(location) {
      return escape(location.start.source.contents.substring(location.start.offset, location.end.offset));
    },

    _createFileAccessExpression: function(location) {
      // window.__qp.functions["<file_name>"]
      return createMemberLookupExpression(
        createMemberExpression('window', '__qp', 'functions'),
        createStringLiteral(Querypoint.generateFileName(location))
      );
    },

    _createFunctionAccessExpression: function(location) {
      // window.__qp.functions["<file_name>"]["<functionId>"] 
      return createMemberLookupExpression(
        this._createFileAccessExpression(location),
        createStringLiteral(this.generateFunctionId(location))
      );
    },

    generateFunctionId: function(location) {
      return location.start.offset;
    },

    _createFileNameStatement: function(tree) {
      // window.__qp.functions["<filename>"] = {};
      var statement = 
        createAssignmentStatement(
          this._createFileAccessExpression(tree.location),
          createObjectLiteralExpression([])     
        )
      return statement;
    },
    
    _createInitializationStatements: function(tree) {
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
    },

    _create__qp_functionStatement: function(location) {
      // var __qp_function = window.__qp.functions["<file_name>"]["<functionId>"];
      return createVariableStatement(
        createVariableDeclarationList(
          TokenType.VAR, 
          QP_FUNCTION, 
          this._createFunctionAccessExpression(location)
        )
      );
    },

    _create__qp_functionToStringStatement: function(location) {
      // var __qp_functionToString = "<source>"
      return createVariableStatement(
        createVariableDeclarationList(
          TokenType.VAR, 
          QP_FUNCTION + 'ToString', 
          createStringLiteral(this._encodedSource(location))
        )
      );
    },

    _createIfRedirectStatement: function() {
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
    },

    _preparePreamble: function(tree) {
      // tree here is a function expr or decl
      this.__qp_functionToStringStatement = this._create__qp_functionToStringStatement(tree.location);
    },

    _createPreambleStatements: function(tree) {
      // tree here is function body
      var var__qp_functionStatement = this._create__qp_functionStatement(tree.location);
      var if__qp_functionCallStatement = this._createIfRedirectStatement(tree.location);
      return [var__qp_functionStatement, this.__qp_functionToStringStatement, if__qp_functionCallStatement];
    },

    transformFunctionDeclaration: function(tree) {
      this._preparePreamble(tree);
      var name = this.transformAny(tree.name);
      var formalParameterList = this.transformAny(tree.formalParameterList);
      var functionBody = this.transformFunctionBody(tree.functionBody);
      if (name === tree.name && formalParameterList === tree.formalParameterList && functionBody === tree.functionBody) {
        return tree;
      }
      return new FunctionDeclaration(tree.location, name, tree.isGenerator, formalParameterList, functionBody);
    },

    transformFunctionExpression: function(tree) {
      this._preparePreamble(tree);
      var name = this.transformAny(tree.name);
      var formalParameterList = this.transformAny(tree.formalParameterList);
      var functionBody = this.transformFunctionBody(tree.functionBody);
      if (name === tree.name && formalParameterList === tree.formalParameterList && functionBody === tree.functionBody) {
        return tree;
      }
      return new FunctionExpression(tree.location, name, tree.isGenerator, formalParameterList, functionBody);
    },

    transformFunctionBody: function(tree) {
      // We'll use these to build __qp.functions objects in _createInitializationStatements
      this.functionLocations.push(tree.location);
      var preamble = this._createPreambleStatements(tree).map(Querypoint.markDoNot);
      tree = this.transformAny(tree);
      tree.statements = preamble.concat(tree.statements);
      return tree;
    },

    transformProgram: function(tree) {
      var fileFunctionLocation = {
          start: {source: tree.location.start.source, offset: 'file'}, 
          end: {source: tree.location.start.source, offset: 'file'}
      };
      this.functionLocations.push(fileFunctionLocation);  // the top-level function for this compilation unit
      var elements = this.transformList(tree.programElements);
      var prefix = [this._createFileNameStatement(tree)].concat(this._createInitializationStatements(tree));
      prefix.push(this._create__qp_functionStatement(fileFunctionLocation));
      prefix = prefix.map(Querypoint.markDoNot);
      elements = prefix.concat(elements);
      return new Program(tree.location, elements);
    }
  }
}());
