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

  var debug = false;

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
 var activationId = Querypoint.activationId;
  
  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function LinearizeTransformer(generateFileName) {
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.labelsInScope = [];        // emca 262 12.12
    this.unlabelledBreakLabels = []; // tracks nested loops and switches 
    this.unlabelledContinueLabels = []; // tracks nested loops
  }

  LinearizeTransformer.transformTree = function(generateFileName, tree) {
    if (debug) { 
      console.log('LinearizeTransformer input:\n' + 
        traceur.outputgeneration.TreeWriter.write(tree));
    }
    var transformer = new LinearizeTransformer(generateFileName);
    var output_tree = transformer.transformAny(tree);
    if (debug) {
      console.log('LinearizeTransformer output:\n' + 
        traceur.outputgeneration.TreeWriter.write(output_tree));
    }
    return output_tree;
  };
  
  /**  TODO ParseTree method
   * Wraps a statement in a block if needed.
   * @param {ParseTree} statements
   * @return {Block}
   */
  function toBlock(tree) {
    if (tree && tree.type !== ParseTreeType.BLOCK) {
      return new Block(tree.location, [tree]);
    } else {
      return tree;
    }
  }

  function shouldLinearizeOutput(tree) {
    return tree.isExpression() && 
              (tree.type !== ParseTreeType.FUNCTION_DECLARATION) &&  // TODO function expression
              (tree.type !== ParseTreeType.POSTFIX_EXPRESSION) && // already linearized below
              (tree.type !== ParseTreeType.MEMBER_LOOKUP_EXPRESSION) && 
              tree.location && 
              !tree.location.varId;
  }

  LinearizeTransformer.prototype =  {
    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,
    
    transformAny: function(tree) {
      var output_tree = 
        ParseTreeTransformer.prototype.transformAny.call(this, tree);
      if (output_tree) {
        if (shouldLinearizeOutput(tree)) {
          output_tree = this.insertVariableFor(output_tree);
        }
        if (debug) {  
          ParseTreeValidator.validate(output_tree);
        }
      }
      return output_tree;
    },
    
    insertVariableFor: function(tree) {
      var linearExpression = Querypoint.InsertVariableForExpressionTransformer.prototype.insertVariableFor.call(this, tree);
      linearExpression.traceIdentifier = traceId;     // Signal TreeWriter
      return linearExpression; 
    }, 
    
    transformAnySkipLinearization: function(tree) {
      // Don't process trees inserted by compiler transformations.
      if (!tree.location) {
        return tree;
      }
      // skip linearization of the tree but not its children
      return ParseTreeTransformer.prototype.transformAny.call(this, tree);
    },
    
    wrapInLabels: function(labels, tree) {
      if (labels.length) {
        return new LabelledStatement(
          tree.location, 
          labels.pop(),
          this.wrapInLabels(labels, tree)
        );
      } else {
        return tree;
      }
    },
    
    getBreakLabel: function() {
      var lastIndex = this.unlabelledBreakLabels.length - 1;
      return this.unlabelledBreakLabels[lastIndex];
    },

    getContinueLabel: function() {
      var lastIndex = this.unlabelledContinueLabels.length - 1;
      return this.unlabelledContinueLabels[lastIndex];
    },
    
    getLabels: function(tree) {
      var labels = [this.getContinueLabel()];
      this.labelsInScope.forEach(function(labelledStatement) {
        if (labelledStatement.statement === tree) {
          labels.push(labelledStatement.name.value);
        }
      });
      return labels;
    },
    
    pushIterationLabels: function(tree) {
      // Establish a label for any enclosed but unlabeled breaks
      var id = this.generateIdentifier(tree);
      this.unlabelledBreakLabels.push(id);
      this.unlabelledContinueLabels.push(id);
    },
    
    popIterationLabels: function() {
      this.unlabelledBreakLabels.pop();
      this.unlabelledContinueLabels.pop();
    },
    
    pushSwitchLabel: function(tree) {
      var id = this.generateIdentifier(tree);
      this.unlabelledBreakLabels.push(id);
    },
    
    popSwitchLabel: function() {
      return this.unlabelledBreakLabels.pop();
    },
    /* Lower a 'while', 'do' loop to single line statements  
    ** aLabel: while (conditionExpr) {bodyStmts}
    ** becomes
    **   aLabel:
    **   unique_label:
    **   while(true) {
    **     insertVariableFor(conditionExpr);   
    **     if (condition) {
    **       aLabel_cont:
    **       unique_label_cont:
    **       do {
    **         bodyStatements;
    **           break; xform to 'break unique_label;'
    **           break aLabel; // ok
    **           continue aLabel; // xform to 'continue aLabel_cont ;'
    **           continue; // xform to unique_label_cont;
    **       } while(false);
    **       // unlabeled continue lands here
    **     } else {
    **       break unique_break_label;
    **     }       
    **     insertVariableFor(incrExpression);
    **   }
    */
    transformWhileStatement: function(tree) {
      // Establish an insertion context to capture loop insertions
      this.pushInsertions();
      
      this.pushIterationLabels(tree);
      
      var labels = this.getLabels(tree);
      
      var condition = this.transformAny(tree.condition);
      if (!condition) {
        condition = createTrueLiteral();
      }
      // Start a new loop BLOCK with the new VARIABLE_STATEMENTs
      var statements =  Array.prototype.slice.call(this.insertions, 0);
      this.insertions = [];
      
      // Any insertions from the loop body will stay in that block
      var body = this.transformAny(toBlock(tree.body)); 
      // Wrap the body in a do..while(false) to trap continue
      var ifClause = new Block(
        tree.body.location,
        [ this.wrapInLabels(
            labels.map(this.createContinueLabel),
            new DoWhileStatement(null, body, createFalseLiteral())
          )]
      );
      var elseBreak = new Block(null, [new BreakStatement(null, null)]);
      var ifStatement = new IfStatement(null, 
        condition, ifClause, elseBreak);
      statements.push(ifStatement);
      
      // Finally the increment expression
      if (tree.increment && !tree.increment.isNull()) {
        this.transformAny(tree.increment);
        // Drop the expression statement 
        statements = this.insertAbove(statements);
      }
      
      this.popInsertions();
      
      var breakIdentifier = this.getBreakLabel();
      this.popIterationLabels();
      
      var alwaysTrue = createTrueLiteral();
      return new LabelledStatement(null, breakIdentifier,
         new WhileStatement(tree.location, alwaysTrue, 
           new Block(null, statements)));
    },
    
    /* Lower a 'do' loop to single line statements  
    ** aLabel: do {body} while (conditionExpr);
    ** becomes
    **   aLabel:
    **   unique_label_cont:
    **   unique_label:
    **   aLabel_cont:
    **     do {
    **       bodyStatements;
    **       insertVariableFor(conditionExpr);
    **     } while(condition);
    */
    transformDoWhileStatement: function(tree) {
      // Establish an insertion context to capture loop insertions
      this.pushInsertions();

      this.pushIterationLabels(tree);
      
      var labels = this.getLabels(tree);
      // Any insertions from the loop body will stay in that block
      var block = this.transformAny(toBlock(tree.body));

      var condition = this.transformAny(tree.condition);
      var statements = this.insertAbove(block.statements);
      block = new Block(block.location, statements);
      
      this.popInsertions();
      this.popIterationLabels();
      
      return this.wrapInLabels(
        labels.map(this.createContinueLabel),
        new DoWhileStatement(tree.location, block, condition)
      );
    },
    
    transformForInStatement: function(tree) {
      this.pushIterationLabels(tree);
      var initializer = this.transformAny(tree.initializer);
      var collection = this.transformAny(tree.collection);
      var body = this.transformAny(toBlock(tree.body));
      if (initializer !== tree.initializer || 
          collection !== tree.collection ||
          body !== tree.body) {
        tree = new ForInStatement(tree.location, 
          initializer, collection, body);
      }
      var labels = this.getLabels(tree);
      this.popIterationLabels();
      return this.wrapInLabels(labels.map(this.createContinueLabel), tree);
    },
    
    /* Lower a 'for' loop to single line statements  
    ** aLabel: for (initStmts; conditionExpr; incrExpression) {bodyStmts}
    ** becomes
    **   initStmts; // maybe linearized above this stmt
    **   whileLoop
    */

    transformForStatement: function(tree) {
      if (tree.initializer && tree.initializer.isExpression()) {
        // The initializer insertions will go outside of our loop.
        // We don't need the newly introduced variable.
        this.transformAny(tree.initializer);
      } else if (tree.initializer && !tree.initializer.isNull()) {  
        var variableDeclarationList = this.transformAny(tree.initializer);
        var statement = new VariableStatement(
          tree.initializer.location, 
          variableDeclarationList);
        this.insertions.push(statement);
      }
      return this.transformWhileStatement(tree);
    },

    transformBinaryOperator: function(tree) {
      var left;
      if (tree.operator.isAssignmentOperator()) {
                // skip linearization of the left hand side of assignments
        left = this.transformAnySkipLinearization(tree.left);
      } else {
        left = this.transformAny(tree.left);
      }
      var right = this.transformAny(tree.right);
      if (left !== tree.left || right !== tree.right) {
        tree = new BinaryOperator(tree.location, left, tree.operator, right);
      }
      return tree;
    },

    transformBreakStatement: function(tree) {
      if (tree.name) {  // labeled break ok as is
        return tree;
      } else {          // else unlabeled break 
        return new BreakStatement(tree.location, this.getBreakLabel());
      }
    },

    transformCallExpressionOperand: function(tree) {
      if (
        tree.type === ParseTreeType.MEMBER_EXPRESSION ||
        tree.type === ParseTreeType.MEMBER_LOOKUP_EXPRESSION
      ) {
        // eg insert var __qp_11 = obj.foo.bind(obj) and return traced __qp_11
        var boundMemberFunction = new CallExpression(
          tree.location,
          new MemberExpression(tree.location, tree, 'bind'),
          new ArgumentList(tree.location, [tree.operand]) 
          );
        return this.insertVariableFor(boundMemberFunction);
      } else {
        return this.transformAny(tree);
      }
    },

    transformCallExpression: function(tree) {
      var operand = this.transformCallExpressionOperand(tree.operand);
      var args = this.transformAny(tree.args);
      if (operand == tree.operand && args == tree.args) {
        return tree;
      }
      return new CallExpression(tree.location, operand, args); 
    },
    
    createContinueLabel: function(identifier) {
      return identifier + '_cont';
    },
    
    transformContinueStatement: function(tree) {
      var label = tree.name || this.getContinueLabel();
      return new ContinueStatement(tree.location, 
        this.createContinueLabel(label)
      );
    },

    transformIfStatement: function(tree) {
      var condition = this.transformAny(tree.condition);
      var ifClause = this.transformAny(toBlock(tree.ifClause));
      var elseClause = this.transformAny(toBlock(tree.elseClause));
      if (condition === tree.condition && 
          ifClause === tree.ifClause && 
          elseClause === tree.elseClause) {
        return tree;
      }
      return new IfStatement(tree.location, condition, ifClause, elseClause);
    },

    transformLabelledStatement: function(tree) {
      // TODO stack the entire labelsInScope on function
      this.labelsInScope.push(tree);  
      // Any statements inserted by tranforming the statement 
      // will end up above the label.
      var statement = this.transformAny(tree.statement);
      this.labelsInScope.pop(tree);
      if (statement == tree.statement) {
        return tree;
      }
      return new LabelledStatement(tree.location, tree.name, statement);
    },

    transformMemberLookupExpression: function(tree) {
      // traceur cannot handle code like obj = {f:5}; ogg = obj; (16, ogg)['f'];
      // 
      var operand = this.transformAnySkipLinearization(tree.operand);
      var memberExpression = this.transformAny(tree.memberExpression);

      return new MemberLookupExpression(tree.location, operand,
                                        memberExpression);
    },

    transformPostfixExpression: function(tree) {
      // inserts eg var __qp_11 = expr; returns ParenExpression for value of expr
      var operandValue = this.transformAnySkipLinearization(tree.operand);  
      var prefixExpresssion = new UnaryExpression(tree.location, tree.operator, tree.operand);

      // inserts eg __qp_13;
      this.insertions.push( 
        new ExpressionStatement(
          tree.location, 
          // inserts eg var __qp_13 = ++expr;
          this.insertVariableFor(prefixExpresssion) 
        )
      );
      return operandValue;  // eg __qp_11;
    },

    transformSwitchStatement: function(tree) {
      // the last label acts like 'empty' in ecma242 12.12
      // Any unlabeled break in the tree directly below here will use it.
      this.pushSwitchLabel(tree);
      var expression = this.transformAny(tree.expression);
      var caseClauses = this.transformList(tree.caseClauses);
      
      var expressionChanged = expression !== tree.expression;
      var caseClauseChanged = caseClauses !== tree.caseClauses;
      if ( expressionChanged || caseClauseChanged ) {
        tree = new SwitchStatement(tree.location, expression, caseClauses);
      }
      var labels = [this.popSwitchLabel()];
      return this.wrapInLabels(labels, tree);
    },
        
/*    transformUnaryExpression: function(tree) {
      var operand = this.transformAny(tree.operand);
      if (operand !== tree.operand) {
        tree = new UnaryExpression(tree.location, tree.operator, operand);
      }
      return this.insertVariableFor(tree);
    },
*/
    transformVariableDeclarationList: function(tree) {
      tree.declarations.forEach(function(declaration) {
          declaration = this.transformAny(declaration); 
          this.insertions.push( new VariableStatement(
            declaration.location, 
            new VariableDeclarationList(declaration.location, 
              TokenType.VAR, [declaration])
          ));
        }.bind(this)
      );
      // the last one can be the result, rest inserted by parent
      var lastStatement = this.insertions.pop();
      return lastStatement.declarations;
    }
    
  };

  Querypoint.LinearizeTransformer = LinearizeTransformer;

}());

