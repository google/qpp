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
  
  'use strict';

  var debug = DebugLogger.register('LinearizeTransformer', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var ParseTreeType = traceur.syntax.trees.ParseTreeType;
  
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var Trees = traceur.syntax.trees;
  var TokenType = traceur.syntax.TokenType;
  var Token = traceur.syntax.Token;
  
  var createTrueLiteral = ParseTreeFactory.createTrueLiteral;
  var createFalseLiteral = ParseTreeFactory.createFalseLiteral;
  var createNumberLiteral = ParseTreeFactory.createNumberLiteral;
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
  var createOperatorToken = ParseTreeFactory.createOperatorToken;
  var createIdentifierToken = ParseTreeFactory.createIdentifierToken;

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
  var ConditionalExpression = Trees.ConditionalExpression;
  
  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;
  
  // Constant
 var activationId = Querypoint.activationId;
  
  /**
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function LinearizeTransformer() {
    Querypoint.InsertVariableForExpressionTransformer.call(this);
    this.labelsInScope = [];        // emca 262 12.12
    this.unlabelledBreakLabels = []; // tracks nested loops and switches 
    this.unlabelledContinueLabels = []; // tracks nested loops
  }

  LinearizeTransformer.transformTree = function(tree) {
    if (debug) { 
      console.log('LinearizeTransformer input:\n' + 
        traceur.outputgeneration.TreeWriter.write(tree));
    }
    var transformer = new LinearizeTransformer();
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
              (tree.type !== ParseTreeType.LITERAL_EXPRESSION) &&
              tree.location && 
              !tree.doNotTrace;
  }

  LinearizeTransformer.prototype =  {
    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,
    
    transformTree: function(tree) {
        return this.transformAny(tree);
    },
    
    transformAny: function(tree) {
      var output_tree = 
        ParseTreeTransformer.prototype.transformAny.call(this, tree);
      if (output_tree) {
        if (shouldLinearizeOutput(output_tree)) {
          output_tree = this.insertVariableFor(output_tree);
        }
        if (debug) {  
          ParseTreeValidator.validate(output_tree);
        }
      }
      return output_tree;
    },
    
    insertVariableFor: function(tree, traceId) {
      var linearExpression = Querypoint.InsertVariableForExpressionTransformer.prototype.insertVariableFor.call(this, tree, traceId);
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
      if (tree.increment) {
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
      var breakIdentifier = this.getBreakLabel();
      this.popIterationLabels();
      
      return this.wrapInLabels(
        labels.map(this.createContinueLabel).concat(breakIdentifier),
        new DoWhileStatement(tree.location, block, condition)
      );
    },
    
    transformForInStatement: function(tree) {
      this.pushIterationLabels(tree);
      var initializer = this.transformAnySkipLinearization(tree.initializer);
      initializer.isReferenceTree = true;
      
      var collection = this.transformAny(tree.collection);
      var body = this.transformAny(toBlock(tree.body));
      if (initializer !== tree.initializer || 
          collection !== tree.collection ||
          body !== tree.body) {
        tree = new ForInStatement(tree.location, 
          initializer, collection, body);
      }
      var labels = this.getLabels(tree);
      var breakIdentifier = this.getBreakLabel();
      this.popIterationLabels();
      return this.wrapInLabels(labels.map(this.createContinueLabel).concat(breakIdentifier), tree);
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
      } else if (tree.initializer) {  
        var variableDeclarationList = this.transformAny(tree.initializer);
        var statement = new VariableStatement(
          tree.initializer.location, 
          variableDeclarationList);
        this.insertions.push(statement);
      }
      return this.transformWhileStatement(tree);
    },

    _transformBinaryAssignmentOperator: function(tree) {
      // We can't simply linearize the lhs of the assignment because we can't express
      // the reference. For example, we cannot substitute a temp for obj.prop in
      // obj.prop = 5;
      // Another issue is that assignment is not like other binary  operators that 
      // create values. For c*(a+b), the sum or pdt is the value that we want to trace 
      // For c.b = a, the value we want to trace is c.b, the LHS after the assignment.
      //  __qp_558_14 = a; // trace value
      //   c.b = __qp_558_14;  // for lastChange write-barrier
      // What about c.b = a = 5; ?
      //  __qp_xx = 5;  // Not if it is a Literal!
      //   a = (trace __qp_xx, _qp_xx);   // emit assignment statement for lastChange write-barrier
      //  __qp_yy = a;
      //   c.b = (trace __qp_yy, _qp_yy);  // return temp, next call: emit assignment statement
      // Another case is an expression computing to an object ref in a property lookup:
      // someObject().foo = 5;
      // We linearize the ref, emit the assignment, then the LHS and trace:
      //   __qp_559_10 = someObject();    
      //   __qp_559_15 = 5;  
      //   (trace __qp_559_10, __qp_559_10).foo = (trace __qp_559_15, __qp_559_15);     

      var left = this.transformAnySkipLinearization(tree.left);
      left.isReferenceTree = true;
      var right = this.transformAny(tree.right);
      delete right.doNotTransform;
      // use offsets from LHS to form the temp name
      var tmp = this.insertVariableFor(right, this.generateIdentifier(tree.left));
      right.doNotTransform = true;
      tmp.location = tree.right.location;
      return new BinaryOperator(tree.location, left, tree.operator, tmp);
    },

    _wrapBlockAroundExpression: function(tree) {
      // { var tmpB = B;}
      var block = new Block(tree.location, [
        new ExpressionStatement(tree.location, tree)
      ]);
      // transform block to put temps inside it.
      block = this.transformAny(block);
      return block;
    },
    
    _extractTempFromBlock: function(block) {
      // Reach in to get the tmp
      var tmpStatement = block.statements[block.statements.length - 1];
      return tmpStatement.expression;
    },

    _insertIfAroundExpression: function(condition, tree) {
      var ifClause = this._wrapBlockAroundExpression(tree);
      var tmpExpression = this._extractTempFromBlock(ifClause);
      // if (tmpA) {var tmpB = B}
      var ifStatement = new IfStatement(null, condition, ifClause, null);
      this.insertions.push( 
        ifStatement
      );
      return tmpExpression;
    },

    // A || B to var tmpA = A; if (tmpA) {var tmpB = B;} tmpA || tmpB
    _transformShortCircuitOperator: function(tree, isOR) {
      // var tmpA = A; tmpA
      var left = this.transformAny(tree.left);
      var condition = left;
      if (isOR) {
        condition = new UnaryExpression(left.location, TokenType.BANG, left);
      }
      var tmpB = this._insertIfAroundExpression(condition, tree.right);
      return new BinaryOperator(tree.location, left, tree.operator, tmpB);
    },

    transformBinaryOperator: function(tree) {
      var operator = tree.operator;
      if (operator.isAssignmentOperator()) {
        return this._transformBinaryAssignmentOperator(tree);
      } else if (operator.type === TokenType.OR || operator.type === TokenType.AND ){
        return this._transformShortCircuitOperator(tree, operator.type === TokenType.OR);
      } else {
        return Querypoint.InsertVariableForExpressionTransformer.prototype.transformBinaryOperator.call(this, tree);
      }
    },

    transformBreakStatement: function(tree) {
      if (tree.name) {  // labeled break ok as is
        return tree;
      } else {          // else unlabeled break 
        return new BreakStatement(tree.location, createIdentifierToken(this.getBreakLabel()));
      }
    },

    _transformObjectMethodCallExpression: function(tree) {
      // insert var __qp_11 = __qp_10.foo.bind(__qp_10) and return traced __qp_11
      var boundMemberFunction = new CallExpression(
        tree.location,
        new MemberExpression(tree.location, tree, 'bind'),  // __qp_10.foo.bind
        new ArgumentList(tree.location, [tree.operand])       // __qp_10
        );
      return this.insertVariableFor(Querypoint.markDoNot(boundMemberFunction));
    },

    // function foo(){}.foo(arg) -> var __qp_10 = function foo(){}; a.foo.bind(__qp_10)(arg);
    _transformCallExpressionOperand: function(tree) {
      if ( tree.type === ParseTreeType.MEMBER_EXPRESSION ) {
        // function foo(){}-> var __qp_10 = function foo(){}; __qp_10
        var operand = this.transformAny(tree.operand);
        tree = new MemberExpression(tree.location, operand, tree.memberName);
        return this._transformObjectMethodCallExpression(tree);
      } else if (tree.type === ParseTreeType.MEMBER_LOOKUP_EXPRESSION) {
        // function foo(){}-> var __qp_10 = function foo(){}; __qp_10
        var operand = this.transformAny(tree.operand);
        var memberExpression = this.transformAny(tree.memberExpression);
        tree = new MemberLookupExpression(tree.location, operand, memberExpression);
        return this._transformObjectMethodCallExpression(tree);
      } else {
        return this.transformAny(tree);
      }
    },

    transformCallExpression: function(tree) {
      var operand = this._transformCallExpressionOperand(tree.operand);
      var args = this.transformAny(tree.args);
      if (operand == tree.operand && args == tree.args) {
        return tree;
      }
      return new CallExpression(tree.location, operand, args); 
    },
    
    createContinueLabel: function(identifier) {
      return identifier + '_cont';
    },
    
    createBreakLabel: function(identifier) {
      return identifier + '_break';
    },
    
    // A ? B : C --> var tmpA = A; if (tmpA) { var tmpB = B; } else { var tmpC = C; }  tmpA ? tmpB : tmpC
    transformConditionalExpression: function(tree) {
      var condition = this.transformAny(tree.condition);
      
      var ifClause = this._wrapBlockAroundExpression(tree.left);
      var tmpLeft = this._extractTempFromBlock(ifClause);
      
      var elseClause = this._wrapBlockAroundExpression(tree.right);
      var tmpRight = this._extractTempFromBlock(elseClause);
      
      var ifStatement = new IfStatement(null, condition, ifClause, elseClause);
      this.insertions.push( 
        ifStatement
      );
      return new ConditionalExpression(tree.location, condition, tmpLeft, tmpRight);
    },
    
    transformContinueStatement: function(tree) {
      var label = tree.name || this.getContinueLabel();
      return new ContinueStatement(tree.location, 
        createIdentifierToken(this.createContinueLabel(label))
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

    _binaryOperatorEquivalentToUnary: function(operator) {
      if (operator.type === TokenType.PLUS_PLUS)
        return createOperatorToken(TokenType.PLUS);
      if (operator.type === TokenType.MINUS_MINUS)
        return createOperatorToken(TokenType.MINUS);
      throw new Error("LinearizeTransformer invalid operator " + operator.type);
    },

    _binaryExpressionEquivalentToUnary: function(tree, preOperationValue) {
      var operator = this._binaryOperatorEquivalentToUnary(tree.operator);
      var one =  createNumberLiteral(1);
      return new BinaryOperator(tree.location, preOperationValue, operator, one);
    },

    // obj.prop++ or obj[prop]++  equiv to (tmp = obj.prop, obj.prop = tmp + 1, tmp)
    // 
    transformPostfixExpression: function(tree) {
      // Leave the structure of the reference but replace components with temps, 
      // eg foo()[bar()] -> tmp1 = foo(); tmp2 = bar(); tmp1[tmp2]
      var operand = this.transformAnySkipLinearization(tree.operand);
      operand.isReferenceTree = true;

      // tmp3 = tmp1[tmp2]; tmp3
      var preOperationValue = this.insertVariableFor(operand);

      // ++tmp3
      var postOperationExpr = this._binaryExpressionEquivalentToUnary(tree, preOperationValue);

      // var tmp4 = ++tmp3;
      var postOperationTemp = this.insertVariableFor(postOperationExpr);
      
      // Mark after the insertVariableFor or it won't take.
      postOperationExpr.doNotTransform = true;
      postOperationTemp.doNotTransform = true;
      
      // Right side needs a location for the ValueChangeTransformer
      postOperationTemp.location = tree.location;
      
      // tmp1[tmp2] = tmp4
      var assignment = new BinaryOperator(tree.location, operand, createOperatorToken(TokenType.EQUAL), postOperationTemp);

      // inserts tmp1[tmp2] = ++tmp3;
      this.insertions.push( 
        new ExpressionStatement(
          tree.location, 
          assignment
        )
      );
      return preOperationValue;  // eg tmp3
    },

    transformSwitchStatement: function(tree) {
      // transform the expression outside of the case stack
      var expression = this.transformAny(tree.expression);
      // the last label acts like 'empty' in ecma242 12.12
      // Any unlabeled break in the tree directly below here will use it.
      this.pushSwitchLabel(tree);
      var caseClauses = this.transformList(tree.caseClauses);
      var expressionChanged = expression !== tree.expression;
      var caseClauseChanged = caseClauses !== tree.caseClauses;
      if ( expressionChanged || caseClauseChanged ) {
        tree = new SwitchStatement(tree.location, expression, caseClauses);
      }
      var labels = [this.popSwitchLabel()];
      return this.wrapInLabels(labels, tree);
    },
        

    transformUnaryExpression: function(tree) {
      var opType = tree.operator.type;
      if (opType === TokenType.PLUS_PLUS || opType === TokenType.MINUS_MINUS) {
        return this._transformUnaryAssignmentExpression(tree);
      } else if (opType === TokenType.TYPEOF || opType === TokenType.DELETE) {
        return this._transformTypeofExpression(tree);
      } else {
        return this._transformSimpleUnaryExpression(tree);
      }
    },
    /**
     * ++obj.prop or ++obj[prop]  equiv to (obj.prop = obj.prop + 1) 
     * (obj.prop = obj.prop + 1)  equiv to (tmp1 = obj.prop; tmp2 = ++tmp1, obj.prop = tmp2, tmp2)  
     * trace value: ++obj.prop;
     */
    _transformUnaryAssignmentExpression: function(tree) {
      // Leave the structure of the reference, but replace components with temps
      var operand = this.transformAnySkipLinearization(tree.operand);
      // Mark the tree for ValueChange. This mark must be copied by subsequent transformations.
      operand.isReferenceTree = true;
      
      var operator = tree.operator;
      if (operator.type === TokenType.PLUS_PLUS) 
        operator = new Token(TokenType.PLUS, operator.location);
      else if (operator.type === TokenType.MINUS_MINUS) 
        operator = new Token(TokenType.MINUS, operator.location);
      else 
        throw new Error("Not a unary assignment expression");

      // var tmp1 = obj.prop; tmp1
      var preOperationValue = this.insertVariableFor(operand);
      // ++tmp1
      var postOperationExpr = this._binaryExpressionEquivalentToUnary(tree, preOperationValue);
      
      // var tmp2 = ++tmp1; tmp2
      var postOperationTemp = this.insertVariableFor(postOperationExpr);
      
      // Mark after insertVariableFor
      postOperationExpr.doNotTransform = true;
            
      // Right side needs a location for the ValueChangeTransformer
      postOperationTemp.location = tree.location;
      
      // obj.prop = tmp2
      var assignmentExpr = new BinaryOperator(tree.location, operand, createOperatorToken(TokenType.EQUAL), postOperationTemp);
      var assignmentStatement = this.insertions.push(
        new ExpressionStatement(
          tree.location,
          assignmentExpr
        )
      );
      return postOperationTemp;
    },
    
    // If the operand is undefined we cannot use it as the RHS of an var declaration of a tmp.
    _transformTypeofExpression: function(tree) {
      // We can't linearize the operand without even more typeof tests...
      var operand = tree.operand;
      // typeof expr
      var conditionLeft = new UnaryExpression(tree.location, tree.operator, operand);
      var literalUndefined = createStringLiteral('undefined');
      // typeof expr === 'undefined'
      var conditionalVarDecl = new ConditionalExpression(
        tree.location, 
        new BinaryOperator(null, conditionLeft, createOperatorToken(TokenType.EQUAL_EQUAL_EQUAL), literalUndefined),
        createUndefinedExpression(), 
        operand
      );
      // var __qp_334 = typeof expr === 'undefined' ? undefined : expr;
      var tmp = this.insertVariableFor(conditionalVarDecl);
      // __qp_334; // tracable statement
      this.insertions.push(createExpressionStatement(tmp));
      // Return the oringal expression to get the correct execution behavior.
      return tree;
    },

    /* 
     * Non-assignment unary expressions, eg -x. 
     * tmp = -x;
     * tmp
     */
    _transformSimpleUnaryExpression: function(tree) {
      var operand = this.transformAny(tree.operand);
      if (operand !== tree.operand) {
        tree = new UnaryExpression(tree.location, tree.operator, operand);
      }
      tree = this.insertVariableFor(tree);
      return tree;
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
    
  };

  Querypoint.LinearizeTransformer = LinearizeTransformer;

}());

