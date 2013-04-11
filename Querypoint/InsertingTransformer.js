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

// Base class for inserting statements in a ParseTree

(function() {
  
  'use strict';

  var debug = true;

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var TokenType = traceur.syntax.TokenType;

  var Trees = traceur.syntax.trees;  
  var Block = Trees.Block;
  var Program = Trees.Program;
 
  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;
  
  // Constant
  var generatedIdentifierBase = 1;

  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function InsertingTransformer() {
    ParseTreeTransformer.call(this);
    this.insertions = [];      // statements to be added to this block
    this.expressionStack = []; // tracks compound expressions
    this.insertionStack = [];  // insertions waiting for inner blocks to exit
    this.blockStack = [];      // tracks nest blocks
    this.insertAbove = this.insertAbove.bind(this);
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
    
    transformCaseClause: function(tree) {
      // var insertions here go above the switch statement
      var expression = this.transformAny(tree.expression);
      this.pushInsertions();  // insertions in case statements stay there.
      var statements = this.transformListInsertEach(tree.statements, 
        this.insertAbove);
      this.popInsertions();
      if (expression === tree.expression && statements === tree.statements) {
        return tree;
      }
      return new Trees.CaseClause(tree.location, expression, statements);
    },
    
    transformDefaultClause: function(tree) {
      this.pushInsertions();
      var statements =  this.transformListInsertEach(tree.statements, 
        this.insertAbove);
      this.popInsertions();
      if (statements === tree.statements) {
        return tree;
      }
      return new Trees.DefaultClause(tree.location, statements);
    },
    
    transformProgram: function(tree) {
      var elements = this.transformListInsertEach(tree.programElements, 
        this.insertAbove);
      return new Program(tree.location, elements);
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
          if (debug) {
            ParseTreeValidator.validate(transformedElement);
          } 
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
