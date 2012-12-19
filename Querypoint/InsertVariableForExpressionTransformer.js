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

// Derived classes call .insertVariableFor(tree)

(function() {
  window.Querypoint = window.Querypoint || {};

  'use strict';

  var debug = false;

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var ParseTreeType = traceur.syntax.trees.ParseTreeType;
  
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var Trees = traceur.syntax.trees;
  var TokenType = traceur.syntax.TokenType;

  var createVariableDeclarationList = ParseTreeFactory.createVariableDeclarationList;

  var createVariableStatement = ParseTreeFactory.createVariableStatement;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;

  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;

  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function InsertVariableForExpressionTransformer(generateFileName) {
    Querypoint.InsertingTransformer.call(this, generateFileName);
  }


  InsertVariableForExpressionTransformer.prototype =  {
    __proto__: Querypoint.InsertingTransformer.prototype,

    /* Convert an expression tree into 
    **    a reference to a VariableStatement and its value.
    ** Insert the VariableStatement and return a new expression with the same value as the incoming one. 
    ** expr -> var __qp_XX = expr; __qp_XX
    ** @param {ParseTree} tree
    ** @return {ParseTree}
    ** side-effect: this.insertions.length++
    */
    insertVariableFor: function(tree) {
      if (!tree.isExpression()) {
        var msg = 'Attempt to insertVariableFor a non-expression tree';
        console.error(msg, traceur.outputgeneration.TreeWriter.write(tree));
        throw new Error(msg);
      }
      
      var traceId =  this.generateIdentifier(tree);  // XX in __qp_XX
      var varId = '__qp' + traceId;
      
      var loc = tree.location;
      loc.traceId = traceId;  // used to match traces to the AST
      loc.varId = varId;        // used to write new AST nodes

      // var __qp_XX = expr;
      var tempVariableStatement = createVariableStatement(
        createVariableDeclarationList(
          TokenType.VAR, 
          varId,
          tree
        )
      );
      this.insertions.push(tempVariableStatement);
      // __qp__XX
      var linearExpression = createIdentifierExpression(varId);
     
      if (debug) {
        ParseTreeValidator.validate(linearExpression); 
        console.log('inserting ' + varId + ' for '+tree.type + ' : ' + traceur.outputgeneration.TreeWriter.write(tree));
      }
      return linearExpression;
    },
  };
  
  Querypoint.InsertVariableForExpressionTransformer = InsertVariableForExpressionTransformer;

}());