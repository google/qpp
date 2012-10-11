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

/*globals traceur console*/

// Lower an ES3 tree to line-oriented statements.
//   Control flow constructs -> blocks.
//   Compound expressions -> statements in blocks.

traceur.define('outputgeneration', function() {
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
  
  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;
  
  // Constant
  var activationId = '__qp_activation';

  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function LinearizeTransformer(identifierGenerator) {
    this.insertions = [];      // statements to be added to this block
    this.expressionStack = []; // tracks compound expressions
    this.insertionStack = [];  // insertions waiting for inner blocks to exit
    this.blockStack = [];      // tracks nest blocks
    this.labelsInScope = [];        // emca 262 12.12
    this.unlabelledBreakLabels = []; // tracks nested loops and switches 
    this.unlabelledContinueLabels = []; // tracks nested loops
    this.functionLocations = [];       // tree.location for all functions parsed 
    
    this.identifierGenerator_ = identifierGenerator;
    this.insertAbove = this.insertAbove.bind(this);
  }

  LinearizeTransformer.transformTree = function(identifierGenerator, tree) {
    if (debug) { 
      console.log('LinearizeTransformer input:\n' + 
        traceur.outputgeneration.TreeWriter.write(tree));
    }
    var transformer = new LinearizeTransformer(identifierGenerator);
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

  LinearizeTransformer.prototype = traceur.createObject(
    ParseTreeTransformer.prototype, {

      transformAny: function(tree) {
        var output_tree = 
          ParseTreeTransformer.prototype.transformAny.call(this, tree);
        if (output_tree && this.isNonLinear(output_tree)) {
          output_tree = this.linearize(output_tree);
        }
        if (output_tree) {
          ParseTreeValidator.validate(output_tree);
        }
        return output_tree;
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

      isNonLinear: function(tree) {
        switch(tree.type) {
          case ParseTreeType.UNARY_EXPRESSION:
            if (
              (tree.operator.type === TokenType.PLUS_PLUS) ||
              (tree.operator.type === TokenType.MINUS_MINUS) 
            ){
               return false;
            } 
            return true;
          case ParseTreeType.BINARY_OPERATOR: 
          case ParseTreeType.POSTFIX_EXPRESSION:
          case ParseTreeType.CALL_EXPRESSION:
            return true;
          default:
            return false;
        }
      },
      // Subexpression we do not want to create statement from
      isLinear: function(tree) {
        switch(tree.type) {
          case ParseTreeType.VARIABLE_DECLARATION_LIST:
            return (tree.declarations.length === 1);
          case ParseTreeType.IDENTIFIER_EXPRESSION:
          case ParseTreeType.FORMAL_PARAMETER_LIST:
          case ParseTreeType.LITERAL_EXPRESSION:
          case ParseTreeType.BINDING_IDENTIFIER:
          case ParseTreeType.PROGRAM:
          case ParseTreeType.ARGUMENT_LIST:
          case ParseTreeType.MEMBER_EXPRESSION:
          case ParseTreeType.PROPERTY_NAME_ASSIGNMENT:
          case ParseTreeType.GET_ACCESSOR:
          case ParseTreeType.SET_ACCESSOR:
          case ParseTreeType.OBJECT_LITERAL_EXPRESSION:
          case ParseTreeType.CASE_CLAUSE:
          case ParseTreeType.DEFAULT_CLAUSE:
            return true;
          default: 
            return false;
        }
      },
      
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
          return 'v'+this.identifierGenerator_.generateUniqueIdentifier();
        }

        return '_' + tree.location.start.offset;
      },
      
      /* Convert an expression tree into 
      **    a reference to a VariableStatement and its value
      ** expr -> var vXX = expr; vXX;
      ** @param {ParseTree} tree
      ** @return {ParseTree}
      ** side-effect: this.insertions.length++
      */
      linearize: function(tree) {
        if (!tree.isExpression()) {
          var msg = 'Attempt to linearize a non-expression tree';
          console.error(msg, traceur.outputgeneration.TreeWriter.write(tree));
          throw new Error(msg);
        }
        
        var identifier =  this.generateIdentifier(tree);
        var loc = tree.location;
        // eg __qp_activation.offset = ! condition.value, undefined;
        var addedLine = this._postPendComma(
          tree.location,
          createAssignmentExpression(
            createMemberExpression(
              createIdentifierExpression(activationId),
              identifier
            ),
            tree
          )
        );
        this.insertions.push(addedLine);
        if (debug) {
          console.log('inserting ' + identifier + ' for '+tree.type, tree);
        }
        return new MemberExpression(tree.location, createIdentifierExpression(activationId), identifier);
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
        return new Block(tree.location, elements);f
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
            if (!builder) {
              builder = list.slice(0, index);
            }
            builder = inserter(builder, transformedElement);
          }
        }

        return builder || list;
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
      **     linearize(conditionExpr);   
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
      **     linearize(incrExpression);
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
      **       linearize(conditionExpr);
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

      _varDecl: function(loc, id, tree) {
        return new VariableStatement(loc, 
          new VariableDeclarationList(loc, TokenType.VAR, 
            [new VariableDeclaration(loc, 
                 new BindingIdentifier(loc, id), 
                 tree
            )]
          )
        );
      },
      
      _postPendComma: function(loc, tree) {
          return new ExpressionStatement(loc, 
            new CommaExpression(loc, [tree, createUndefinedExpression()])
          );
      },
      
      _generateFunctionId: function(location) {
        if (location) {
          return location.start.source.name + '_' + location.start.offset;
        } else {
          return "internalFunction";
        }
      }, 
      
      _createActivationStatements: function(tree) {
        // var activation = {turn: window.__qp.turn};   // used to store traces by offset

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
ParseTreeValidator.validate(activationStatement);

        // window.__qp.activations[__qp_functionId].push(activation),; 
        var pushExpression = 
          createCallExpression(
            createMemberExpression(
              createMemberLookupExpression(
                createMemberExpression('window', '__qp', 'activations'),
                createStringLiteral(this._generateFunctionId(tree.location))
              ),
              'push'
            ),
            createArgumentList(
              createIdentifierExpression(activationId)
            )
          );
        
        // We need to suppress the return value of the push() 
        var pushStatement = this._postPendComma(tree.location, pushExpression);
ParseTreeValidator.validate(pushStatement);
        return [activationStatement, pushStatement];
      },

      transformFunctionBody: function(tree) {
        // We'll use these to build __qp.activations objects in _createInitializationStatements
        this.functionLocations.push(tree.location)
        // prefix the body with the definition of the new activation record

        var statements = this._createActivationStatements(tree).concat(this.transformAny(tree).statements);
        return new Block(tree.location, statements);
      },
      
      transformBreakStatement: function(tree) {
        if (tree.name) {  // labeled break ok as is
          return tree;
        } else {          // else unlabeled break 
          return new BreakStatement(tree.location, this.getBreakLabel());
        }
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
        return new CaseClause(tree.location, expression, statements);
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
      
      transformDefaultClause: function(tree) {
        var statements =  this.transformListInsertEach(tree.statements, 
          this.insertAbove);
        if (statements === tree.statements) {
          return tree;
        }
        return new DefaultClause(tree.location, statements);
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
        if (statement === tree.statement) {
          return tree;
        }
        return new LabelledStatement(tree.location, tree.name, statement);
      },
      
      _createInitializationStatements: function(tree) {
        var statements = [];
        this.functionLocations.forEach(function(location) {
          // window.__qp.activations[<file_name>_<offset>] = [];
          statements.push(

              createAssignmentStatement(
                createMemberLookupExpression(
                  createMemberExpression('window', '__qp', 'activations'),
                  createStringLiteral(this._generateFunctionId(location))
                ),
                createArrayLiteralExpression([])
              )
            );
        }.bind(this));
        return statements;
      }, 
      
      transformProgram: function(tree) {
        this.functionLocations.push(tree.location);  // top-level function
        var activationStatements = this._createActivationStatements(tree);
        var elements = this.transformListInsertEach(tree.programElements, 
          this.insertAbove);
        var initializationStatements = this._createInitializationStatements(tree);
        elements = initializationStatements.concat(activationStatements).concat(elements);
        return new Program(tree.location, elements);
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
      
  });

  return {
    LinearizeTransformer: LinearizeTransformer
  };
});
