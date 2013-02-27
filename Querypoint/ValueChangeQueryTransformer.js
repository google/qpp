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
  var createTrueLiteral = ParseTreeFactory.createTrueLiteral;
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
  var UnaryExpression = Trees.UnaryExpression;
  
    // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;

  var debug = DebugLogger.register('ValueChangeQueryTransformer', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  })
  
  /*
    Trace expressions that change object property values.
    obj.prop = value;
    obj[prop] = value;  // for all kinds of assignment
    obj.prop++           
    obj[prop]++         // for all unary operators
    obj = {prop: value}
  */

  function propertyChangeStatement(objectExpression, memberExpression, valueTree, traceLocation) {
      // I suppose we may want to point at the obj.prop expression, but let's try the value first
      var traceStart = traceLocation.start.offset; 
      var traceEnd = traceLocation.end.offset;
      var traceFile = traceLocation.start.source.name;
      // window.__qp.propertyChanges[propertyName]push({obj: <objExpr>, prop: <propExpr>, ...)
      var statement =
        createExpressionStatement(
          createCallExpression(
            createMemberExpression( 
              createMemberLookupExpression(
                createMemberExpression('window', '__qp','propertyChanges'),
                memberExpression
              ), 
              'push'
            ),
            createArgumentList(
              createObjectLiteralExpression([
                createPropertyNameAssignment('obj', objectExpression),
                createPropertyNameAssignment('property', memberExpression),
                createPropertyNameAssignment('activations', createIdentifierExpression('__qp_function')),
                createPropertyNameAssignment('activationIndex', createMemberExpression('__qp_function', 'length')),
                createPropertyNameAssignment('startOffset', createStringLiteral(traceStart.toString())),
                createPropertyNameAssignment('endOffset', createStringLiteral(traceEnd.toString())),
                createPropertyNameAssignment('file', createStringLiteral(traceFile.toString())),
                createPropertyNameAssignment('value', valueTree),
              ])
            )
          )
        );
        statement.doNotTransform = true;
        statement.doNotTrace = true;
        if (debug) ParseTreeValidator.validate(statement);
        return statement;         
  };
  
  function propertyChangeTrace(objectExpression, memberExpression, valueTree, traceLocation) {
      // if (window.__qp.isTraced(memberExpression)) { trace };
      var traceStatement = propertyChangeStatement(objectExpression, memberExpression, valueTree, traceLocation);
      traceStatement.doNotTrace = true;
      traceStatement.doNotTransform = true;
      var ifStatement =
        ParseTreeFactory.createIfStatement(
          createCallExpression(
            createMemberExpression('window', '__qp', 'isTraced'),
            createArgumentList(
              memberExpression  // TODO this is traced, (__qp_activation._170_1 = window.__qp.trace(__qp_170_1)), __qp_170_1)
            )
          ),
          traceStatement
        );
      ifStatement.doNotTransform = true;
      ifStatement.doNotTrace = true;
      if (debug) ParseTreeValidator.validate(ifStatement);
      return ifStatement;
  };

  var SetTracedPropertyObjectTransformer = Querypoint.SetTracedPropertyObjectTransformer = function(propertyKey, generateFileName, tree) {
    this.propertyKey = propertyKey;
    this.generateFileName = generateFileName;
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.propertyAccessExpressionStart = tree.location.start.offset;
    this.propertyAccessExpressionEnd = tree.location.end.offset;
  }

  SetTracedPropertyObjectTransformer.prototype = {

    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,

    transformAny: function(tree) {
      if (this.found)
        return tree;
        
      if (tree && !tree.doNotTransform && tree.location) {
        var treeOffset = tree.location.start.offset;
        if ( this.propertyAccessExpressionEnd === tree.location.end.offset &&
             this.propertyAccessExpressionStart === tree.location.start.offset) {
          // tree is obj[prop]
          tree.operand = this._insertObjectCheck(tree.operand, this.propertyAccessExpressionStart);
          this.found = tree;  // stop early
        }
      }
      tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);

      return tree;
    },

    _insertObjectCheck: function(operand, tracedObjectOffset) {
      // We are at the object reference tree where we need to check if other traces for
      // the property used the required object.
      
      // If the operand is a complex expression, we need a temp to avoid
      // double execution of the expression.
      if (operand.type !== 'IDENTIFIER_EXPRESSION') {
        operand = this.insertVariableFor(operand);
      }
      
      // window.__qp.setTracedPropertyObject(ourObj, <propertyKey>, tracedObjectOffset);
      var objectCheck = 
        createExpressionStatement(
          createCallExpression(
            createMemberExpression('window', '__qp', 'setTracedPropertyObject'),
            createArgumentList(
              operand, 
              createStringLiteral(this.propertyKey),
              createNumberLiteral(tracedObjectOffset)
            )
          )
        );
       objectCheck.doNotTransform = true;
       this.insertions.push(objectCheck);
       return operand;
    },
  };

  var ValueChangeQueryTransformer = Querypoint.ValueChangeQueryTransformer = function(propertyKey, generateFileName) {
    this.generateFileName = generateFileName;
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.propertyKey = propertyKey;
  }

  var QP_FUNCTION = '__qp_function';

    /**
     * obj = {name: value}
     * @param {ObjectLiteralExpression} tree
     * @return {ParseTree}
     */
  ValueChangeQueryTransformer.prototype = {

    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,

    transformAny: function(tree) {
      if (tree && !tree.doNotTransform)
        tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);

      return tree;
    },

    /**
     * ++obj.prop or ++obj[prop]  equiv to obj.prop = obj.prop + 1 
     * trace value: ++obj.prop;
     * @param {UnaryExpression} tree
     * @return {ParseTree}
     */
    transformUnaryExpression: function(tree) {
      if (tree.operator.type !== TokenType.PLUS_PLUS && tree.operator.type !== TokenType.MINUS_MINUS) {
        return Querypoint.InsertVariableForExpressionTransformer.prototype.transformUnaryExpression.call(this, tree);
      }
      this.isReferenceTree = true;
      var operand = this.transformAny(tree.operand);
      this.isReferenceTree = false;
      
      if (operand !== tree.operand) { // then the operand had a property access
        // We have operand as tmp1[tmp2]
        // Use the temporary vars in a new expression, eg ++tmp1[tmp2]
        var unaryExpression = new UnaryExpression(tree.location, tree.operator, operand);
        // insert a temporary for the expression so we can trace it without double operations
        unaryExpression = this.insertVariableFor(unaryExpression);
        // Finally insert the tracing statement  
        this.insertions.push(this.trace(unaryExpression, tree.location));
        return unaryExpression; 
      } else {
        return tree;  
      }
    },

    /**
      obj.prop++ or obj[prop]++
      Identical to prefix case because we are creating temps for the whole expression.
    */
    transformPostfixExpression: function(tree) {
      return this.transformUnaryExpression(tree);
    },

    /**
     * @param {BinaryOperator} tree
     * @return {ParseTree}
     */
    transformBinaryOperator: function(tree) {
      if (!tree.operator.isAssignmentOperator()) {
        return Querypoint.InsertVariableForExpressionTransformer.prototype.transformBinaryOperator.call(this, tree);
      }
      // else assignment, LHS = *= += etc RHS
      var right = this.transformAny(tree.right);
    
      this.isReferenceTree = true;
      var left = this.transformAny(tree.left);
      this.isReferenceTree = false;
      
      if (left !== tree.left) { // Then we found something we want to trace
        if (!right.doNotTransform && !right.doNotTrace) {
          // Create a temp for the RHS to avoid double calls when we trace.
          right = this.insertVariableFor(right);  
          this.insertions.push(this.trace(right, tree.right.location));   
        }
      }

      if (left == tree.left && right == tree.right) {
        return tree;
      } else {
        return new BinaryOperator(tree.location, left, tree.operator, right);  
      }
    },

    transformMemberExpression: function(tree) {
      // eg obj.field => obj['field']
      var memberExpression = new LiteralExpression(
        tree.memberName.location, 
        createStringLiteralToken(tree.memberName.value)
      );

      tree = new MemberLookupExpression(tree.location, tree.operand, memberExpression);
      return this.transformMemberLookupExpression(tree);
    },

    /**
     * obj[string]
     * @param {MemberLookupExpression} tree
     * @return {ParseTree}
     */
    transformMemberLookupExpression: function(tree) {

      var operand = this.transformAny(tree.operand);
      var memberExpression = this.transformAny(tree.memberExpression);

      if (this.isReferenceTree) {
         operand = this.insertVariableFor(operand);
         memberExpression = this.insertVariableFor(memberExpression);
         this.reference = {
            base: operand,
            name: memberExpression
          };
      }

      if (operand !== tree.operand || memberExpression !== tree.memberExpression)
        tree = new MemberLookupExpression(tree.location, operand, memberExpression);

      return tree;
    },

    trace: function(valueTree, traceLocation) {
      return propertyChangeTrace(this.reference.base, this.reference.name, valueTree, traceLocation);
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
      propertyChangesInitialization.doNotTrace = true;
      propertyChangesInitialization.doNotTransform = true;
      
      // window.__qp.propertyChanges.<propertyKey> = [];
      var propertyChangesMemberInitialization = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges', this.propertyKey),
          createArrayLiteralExpression([])
         );
      propertyChangesMemberInitialization.doNotTrace = true;
      propertyChangesMemberInitialization.doNotTransform = true;

      // window.__qp.setTraced(<propertyKey>);
      var setTracedStatement =
        createExpressionStatement(
          createCallExpression(
            createMemberExpression('window', '__qp', 'setTraced'),
            createArgumentList(
              createStringLiteral(this.propertyKey)
            )
          )
        );

      return [propertyChangesInitialization, propertyChangesMemberInitialization, setTracedStatement];
    },

  };

}());