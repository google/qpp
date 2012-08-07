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

traceur.outputgeneration.QPTransformer = (function() {
  'use strict';

  var debug = true;

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var ParseTreeType = traceur.syntax.trees.ParseTreeType;
  
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var Trees = traceur.syntax.trees;
  var TokenType = traceur.syntax.TokenType;
  
  var createTrueLiteral = ParseTreeFactory.createTrueLiteral;
  var createFalseLiteral = ParseTreeFactory.createFalseLiteral;
  
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
  
  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;

  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function QPTransformer(identifierQueries) {
    this.identifierQueries = identifierQueries; 
    this.identifierGenerator_ = new traceur.codegeneration.UniqueIdentifierGenerator();
  }

  QPTransformer.transformTree = function(tree) {
    if (debug) { 
      console.log('QPTransformer input:\n' + 
        traceur.outputgeneration.TreeWriter.write(tree));
    }
    var transformer = new QPTransformer(this.identifierGenerator_);
    var output_tree = transformer.transformAny(tree);
    if (debug) {
      console.log('QPTransformer output:\n' + 
        traceur.outputgeneration.TreeWriter.write(output_tree));
    }
    return output_tree;
  };

  QPTransformer.prototype = traceur.createObject(
    ParseTreeTransformer.prototype, {

      transformAny: function(tree) {
        var output_tree = 
          ParseTreeTransformer.prototype.transformAny.call(this, tree);
        if (tree) console.log('QPTransformer ' + tree.type);
        if (output_tree) {
          ParseTreeValidator.validate(output_tree);
        }
        return output_tree;
      },

      /**
       * @param {BindingIdentifier} tree
       * @return {ParseTree}
       */
      transformBindingIdentifier: function(tree) {
        var id = tree.identifierToken.value;
        if (this.identifierQueiries.hasOwnProperty(id)) {
            console.log(tree.type + ' id ');
        }
        return tree;
      },

      operatorType: function(operator) {
        switch(operator.type) {
          case TokenType.EQUAL:
          case TokenType.STAR_EQUAL:
          case TokenType.SLASH_EQUAL:
          case TokenType.PERCENT_EQUAL:
          case TokenType.PLUS_EQUAL:
          case TokenType.MINUS_EQUAL:
          case TokenType.LEFT_SHIFT_EQUAL:
          case TokenType.RIGHT_SHIFT_EQUAL:
          case TokenType.UNSIGNED_RIGHT_SHIFT_EQUAL:
          case TokenType.AMPERSAND_EQUAL:
          case TokenType.CARET_EQUAL:
          case TokenType.BAR_EQUAL:
            return 'assignment';
          default:
            return undefined;
        }
      },
      
  });

  return QPTransformer;

}());
