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

var QPTreeWriter = (function() {
  'use strict';
  
  var debug = DebugLogger.register('QPTreeWriter', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  var ParseTreeWriter = traceur.outputgeneration.ParseTreeWriter;
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;
  var createMemberExpression = ParseTreeFactory.createMemberExpression;
  var createCallExpression = ParseTreeFactory.createCallExpression;
  var createArgumentList = ParseTreeFactory.createArgumentList;
  var createAssignmentStatement = ParseTreeFactory.createAssignmentStatement;
  var createParenExpression = ParseTreeFactory.createParenExpression;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;
  var createAssignmentExpression = ParseTreeFactory.createAssignmentExpression;
  var createObjectLiteralExpression = ParseTreeFactory.createObjectLiteralExpression;
  var createPropertyNameAssignment = ParseTreeFactory.createPropertyNameAssignment;
  var createUndefinedExpression = ParseTreeFactory.createUndefinedExpression;
  var createStringLiteral = ParseTreeFactory.createStringLiteral;

  var Trees = traceur.syntax.trees;
  var CommaExpression = Trees.CommaExpression;
  var ObjectLiteralExpression = Trees.ObjectLiteralExpression;
  var VariableStatement = Trees.VariableStatement;
  var BindingIdentifier = Trees.BindingIdentifier;
  var VariableDeclaration = Trees.VariableDeclaration;
  var VariableDeclarationList = Trees.VariableDeclarationList;
  var ExpressionStatement = Trees.ExpressionStatement;

  var TokenType = traceur.syntax.TokenType;
  var ParseTreeType = traceur.syntax.trees.ParseTreeType;

  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;

  // Constant
  var activationId = Querypoint.activationId;
  
    /**
   * @constructor
   */
  function QPTreeWriter(generatedFilename) {
    ParseTreeWriter.call(this, false, false);
    this._generatedFilename = generatedFilename;
  }

  QPTreeWriter.prototype = {

    __proto__: ParseTreeWriter.prototype,

    generateSource: function(tree) {
      this.doTrace = tree.location.traceAll;
      this.visitAny(tree);
      if (this.currentLine_.length > 0) {
        this.writeln_();
      }
      return this.result_.toString();
    },
    
    visitIdentifierExpression: function(tree) {
      // Linearizer has marked the expressions we need to trace with .trace
      var traceId = tree.traceId;
      if (this.doTrace && traceId) {
        if (debug)
          console.log('tracing ' + traceId + ' for '+tree.type + ' : ' + traceur.outputgeneration.TreeWriter.write(tree));
        // To avoid recursion we remove the mark before writing out the tracing expression
        delete tree.traceId;
        // Now we will bury the identifier tree in a tracing expression
        var tracingTree = this._traceIdentifierExpression(tree, traceId);
        ParseTreeWriter.prototype.visitParenExpression.call(this, tracingTree);
      } else {
        ParseTreeWriter.prototype.visitIdentifierExpression.call(this, tree);  
      }
    },

    visitFunctionDeclaration: function(tree) {
      this._visitFunction(tree);
      ParseTreeWriter.prototype.visitFunctionDeclaration.call(this, tree);
    },
    
    visitFunctionExpression: function(tree) {
      this._visitFunction(tree);
      ParseTreeWriter.prototype.visitFunctionExpression.call(this, tree);
    },
    
    _visitFunction: function(tree) {
      // insert the new activation record statements after the function preamble
      this._insertArrayInArray(tree.functionBody.statements, 2, this._createActivationStatements(tree));
    },

    visitProgram: function(tree) {
      // TODO move the function preamble transform
      for(var i = 0; i < tree.programElements.length; i++) {
        if (tree.programElements[i].type === ParseTreeType.VARIABLE_STATEMENT) break;
      }
      this._insertArrayInArray(tree.programElements, i+1, this._createActivationStatements(tree));
      ParseTreeWriter.prototype.visitProgram.call(this, tree);
    },

    _insertArrayInArray: function(container, index, ary) {
      for(var i = 0; i < ary.length; i++) {
        container.splice(index + i, 0, ary[i]);
      }
    },

    _traceIdentifierExpression: function(tree, traceId) {
      // (__qp_activation._<offset> = window.__qp.trace(__qp_XX))
      var traceExpression = createParenExpression(
        createAssignmentExpression(
          createMemberExpression(activationId, traceId),
          createCallExpression(
            createMemberExpression('window', '__qp','trace'),
            createArgumentList(
              tree
            )                    
          )
        )
      );
      
      // ((__qp_activation._<offset> = window.__qp.trace(__qp_XX)), __qp_XX)
      
      var tracedExpressionValue = createParenExpression(
        new CommaExpression(
          tree.location,
          [
            traceExpression,
            tree
          ]  
        )
      );
     
      if (debug) {
        ParseTreeValidator.validate(tracedExpressionValue); 
      }
      return tracedExpressionValue;
    },

    _createActivationStatements: function(tree) {
      // var __qp_activation = {turn: window.__qp.turn};   // used to store traces by offset

      var activationStatement =
        this._varDecl(
          tree.location, 
          activationId, 
          new ObjectLiteralExpression(
            tree.location, 
            [
              createPropertyNameAssignment('turn',
                createMemberExpression('window', '__qp', 'turn')
              )
            ]
          )
        );
        if (debug) {
          ParseTreeValidator.validate(activationStatement);          
        }

      // __qp_function.push(__qp_activation),; 
      var pushExpression = 
        createCallExpression(
          createMemberExpression(
            createIdentifierExpression('__qp_function'),
            'push'
          ),
          createArgumentList(
            createIdentifierExpression(activationId)
          )
        );
      
      // We need to suppress the return value of the push() 
      var pushStatement = this._postPendComma(tree.location, pushExpression);
      if (debug) {
        ParseTreeValidator.validate(pushStatement);
      }

      return [activationStatement, pushStatement].map(Querypoint.markDoNot);
    },
    
    _postPendComma: function(loc, tree, value) {
        return new ExpressionStatement(loc, 
          new CommaExpression(loc, [tree, value || createUndefinedExpression()])
        );
    },

    _varDecl: function(loc, id, tree) {
      return new VariableStatement(loc, 
        new VariableDeclarationList(loc, TokenType.VAR, 
          [new VariableDeclaration(loc, 
               new BindingIdentifier(loc, id),
               null, 
               tree
          )]
        )
      );
    },
    
  };

  return QPTreeWriter;

})();
