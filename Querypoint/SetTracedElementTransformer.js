// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

(function(){
  
  'use strict';

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var createMemberExpression = ParseTreeFactory.createMemberExpression;
  var createMemberLookupExpression = ParseTreeFactory.createMemberLookupExpression;
  var createPropertyNameAssignment = ParseTreeFactory.createPropertyNameAssignment;
  var createStringLiteral = ParseTreeFactory.createStringLiteral;
  var createNumberLiteral = ParseTreeFactory.createNumberLiteral;
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
  var createExpressionStatement = ParseTreeFactory.createExpressionStatement;
  var createBlock = ParseTreeFactory.createBlock;
  var createBinaryOperator = ParseTreeFactory.createBinaryOperator;
  var createOperatorToken = ParseTreeFactory.createOperatorToken;
  var createExpressionStatement = ParseTreeFactory.createExpressionStatement;
  var createStringLiteralToken = ParseTreeFactory.createStringLiteralToken;
 
  var PredefinedName = traceur.syntax.PredefinedName;
  var TokenType = traceur.syntax.TokenType;
  var Trees = traceur.syntax.trees;
  var Program = Trees.Program;
  var BinaryOperator = Trees.BinaryOperator;
  var IdentifierExpression = Trees.IdentifierExpression;
  var LiteralExpression = Trees.LiteralExpression;
  var MemberLookupExpression = Trees.MemberLookupExpression;
  var MemberExpression = Trees.MemberExpression;


  var SetTracedElementTransformer = Querypoint.SetTracedElementTransformer = function(transformData) {
    this._selector = transformData.selector;
    this.propertyKeys = transformData.propertyKeys;
    this._queryIndex = transformData.queryIndex;
    Querypoint.InsertVariableForExpressionTransformer.call(this);
  }

  SetTracedElementTransformer.prototype = {

    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,

    transformTree: function(tree) {
      return tree;
    },

    transformAny: function(tree) {
      return tree;
    },
        // Called once per load by QPRuntime
    runtimeInitializationStatements: function() {
      // window.__qp.propertyChanges = window.__qp.propertyChanges || {};
      var propertyChangesInitialization = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges'),
          createBinaryOperator(
            createMemberExpression('window', '__qp', 'propertyChanges'),
            createOperatorToken(TokenType.OR), 
            createObjectLiteralExpression([])
          )
       );
      
      var statements = [propertyChangesInitialization];
      this.propertyKeys.forEach(function(propertyKey){
        statements.push(this._initializeChanges(propertyKey));
        statements.push(this._setTraced(propertyKey));
      }.bind(this));
      
      return statements;
    },

    _initializeChanges: function(propertyKey) {
      // window.__qp.propertyChanges.<propertyKey> = [];
      var propertyChangesMemberInitialization = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges', propertyKey),
          createArrayLiteralExpression([])
         );
      
      return propertyChangesMemberInitialization;      
    },

    _setTraced: function(propertyKey) {
      // window.__qp.setTracedElement(selector, <propertyKey>, queryNumber);
      var setTracedStatement =
        createExpressionStatement(
          createCallExpression(
            createMemberExpression('window', '__qp', 'setTracedElement'),
            createArgumentList(
              createStringLiteral(this._selector),
              createStringLiteral(propertyKey),
              createNumberLiteral(this._queryIndex)
            )
          )
        );
      return setTracedStatement;
    }
      
  };

}());