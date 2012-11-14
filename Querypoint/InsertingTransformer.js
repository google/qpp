// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Lower an ES3 tree to line-oriented statements.
//   Control flow constructs -> blocks.
//   Compound expressions -> statements in blocks.

(function() {
  window.Querypoint = window.Querypoint || {};

  'use strict';

  var debug = true;

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var ParseTreeType = traceur.syntax.trees.ParseTreeType;
  
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var Trees = traceur.syntax.trees;
  var TokenType = traceur.syntax.TokenType;
  
  var createTrueLiteral = ParseTreeFactory.createTrueLiteral;
  var createFalseLiteral = ParseTreeFactory.createFalseLiteral;
  var createMemberExpression = ParseTreeFactory.createMemberExpression;
  var createMemberLookupExpression = ParseTreeFactory.createMemberLookupExpression;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;
  var createCallExpression = ParseTreeFactory.createCallExpression;
  var createPropertyNameAssignment = ParseTreeFactory.createPropertyNameAssignment;
  var createArgumentList = ParseTreeFactory.createArgumentList;
  var createExpressionStatement = ParseTreeFactory.createExpressionStatement;
  var createStringLiteral = ParseTreeFactory.createStringLiteral;
  var createAssignmentStatement = ParseTreeFactory.createAssignmentStatement;
  var createArrayLiteralExpression = ParseTreeFactory.createArrayLiteralExpression;
  var createUndefinedExpression = ParseTreeFactory.createUndefinedExpression;
  var createAssignmentExpression = ParseTreeFactory.createAssignmentExpression;
  var createObjectLiteralExpression = ParseTreeFactory.createObjectLiteralExpression;
  var createVariableDeclarationList = ParseTreeFactory.createVariableDeclarationList;
  var createVariableStatement = ParseTreeFactory.createVariableStatement;
  var createParenExpression = ParseTreeFactory.createParenExpression;

  var VariableStatement = Trees.VariableStatement;
  var IdentifierExpression = Trees.IdentifierExpression;
  var BindingIdentifier = Trees.BindingIdentifier;
  var Block = Trees.Block;
  var WhileStatement = Trees.WhileStatement;
  var BreakStatement = Trees.BreakStatement;
  var IfStatement = Trees.IfStatement;
  var ForInStatement = Trees.ForInStatement;
  var CaseClause = Trees.CaseClause;
  var DefaultClause = Trees.DefaultClause;
  var DoWhileStatement = Trees.DoWhileStatement;
  var LabelledStatement = Trees.LabelledStatement;
  var Program = traceur.syntax.trees.Program;
  var SwitchStatement = Trees.SwitchStatement;
  var ContinueStatement = Trees.ContinueStatement;
  var VariableDeclaration = Trees.VariableDeclaration;
  var VariableDeclarationList = Trees.VariableDeclarationList;
  var ObjectLiteralExpression = Trees.ObjectLiteralExpression;
  var MemberExpression = Trees.MemberExpression;
  var ExpressionStatement = Trees.ExpressionStatement;
  var CommaExpression = Trees.CommaExpression;
  var UnaryExpression = Trees.UnaryExpression;
  var BinaryOperator = Trees.BinaryOperator;
  var ParenExpression = Trees.ParenExpression;
  var AssignmentExpression = Trees.AssignmentExpression;
  var CallExpression = Trees.CallExpression;
  var ArgumentList = Trees.ArgumentList;
  var PropertyNameAssignment = Trees.PropertyNameAssignment;
  var MemberLookupExpression = Trees.MemberLookupExpression;
  
  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;
  
  // Constant
  var activationId = '__qp_activation';
  var generatedIdentifierBase = 1;

  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function InsertingTransformer(generateFileName) {
    ParseTreeTransformer.call(this);
    this.insertions = [];      // statements to be added to this block
    this.expressionStack = []; // tracks compound expressions
    this.insertionStack = [];  // insertions waiting for inner blocks to exit
    this.blockStack = [];      // tracks nest blocks
    this.insertAbove = this.insertAbove.bind(this);

    this._generateFileName = generateFileName;
  }

  InsertingTransformer.prototype = {
    __proto__: ParseTreeTransformer.prototype,

    // When we enter a new block we create a new context for insertions
    pushInsertions: function() {
      this.blockStack.push(this.expressionStack);
      this.insertionStack.push(this.insertions);
      this.insertions = [];
      this.expressionStack = [];
      return true;
    },
    
    popInsertions: function() {
      this.expressionStack = this.blockStack.pop();
      if (this.insertions.length) {
        console.error(
          'insertions were not completed on an inner block', 
          this.insertions.slice(0)
        );
      }
      this.insertions = this.insertionStack.pop();
    },
   
    generateIdentifier: function(tree) {
      if (!tree.location) {
        return '__qp_' + generatedIdentifierBase++;
      }
      // The end.offset points just past the last character of the token
      var end = tree.location.end.offset;
      return '_' + (end - 1) + '_' + (end - tree.location.start.offset);
    },
   
    transformBlock: function(tree) {
      this.pushInsertions();
      var elements = this.transformListInsertEach(
        tree.statements, 
        this.insertAbove
      );
      this.popInsertions();
      if (elements === tree.statements) {
        return tree;
      }
      return new Block(tree.location, elements);
    },

    // used in transformListInsertEach, the default behavior results
    insertNone: function (list, transformed) {
      return list.push(transformed);
    },

    // Insert between the end of the list and the element
    insertAbove: function(list, transformedElement) {
      if (this.insertions.length) { // add var stmts above our block
        list = list.concat(this.insertions);
        this.insertions = [];
      }
      if (transformedElement) {
        list.push(transformedElement);
      }
      return list;
    },

    // transformList but insert inside of loop
    transformListInsertEach: function(list, inserter) {
      if (list === null || list.length === 0) {
        return list;
      }

      var builder = null;

      for (var index = 0; index < list.length; index++) {
        var element = list[index];
        var transformedElement = this.transformAny(element);

        var transformed = element !== transformedElement;
        if (builder || transformed || this.insertions.length) {
ParseTreeValidator.validate(transformedElement);
          if (!builder) {
            builder = list.slice(0, index);
          }
          builder = inserter(builder, transformedElement);
        }
      }

      return builder || list;
    },
      
  };

  Querypoint.InsertingTransformer = InsertingTransformer;

}());

