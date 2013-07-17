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
                createPropertyNameAssignment('value', createCallExpression(
                  createMemberExpression('window', '__qp','trace'),
                    createArgumentList(
                      valueTree
                    )                    
                  )
                ),
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

  var SetTracedPropertyObjectTransformer = Querypoint.SetTracedPropertyObjectTransformer = function(transformData) {
    this.propertyKey = transformData.propertyKey;
    this.queryIndex = transformData.queryIndex;
    this.propertyAccessStart = transformData.startOffset;
    this.propertyAccessEnd = transformData.endOffset;
    this.propertyAccessFileName = transformData.filename;
    Querypoint.InsertVariableForExpressionTransformer.call(this);
  }

  SetTracedPropertyObjectTransformer.prototype = {

    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,
        
    transformTree: function(tree) {
      // This transformation is unique for each query
      if (this.propertyAccessFileName === tree.location.start.source.name) {
          delete this.found;   
          tree = this.transformAny(tree);
          if (!this.found) 
              throw new Error("ValueChangeQuery.transformParseTree unable to find object to trace");
      }
      return tree;
    },

    transformAny: function(tree) {
      if (this.found)
        return tree;
        
      if (tree && !tree.doNotTransform && tree.location) {
        var treeOffset = tree.location.start.offset;
        if ( this.propertyAccessEnd === tree.location.end.offset &&
             this.propertyAccessStart === tree.location.start.offset) {
          // tree is obj[prop]
          tree.operand = this._insertObjectCheck(tree.operand, this.queryIndex);
          this.found = tree;  // stop early
        }
      }
      tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);

      return tree;
    },

    _insertObjectCheck: function(operand, tracedObjectIndex) {
      // We are at the object reference tree where we need to check if other traces for
      // the property used the required object.
      
      // If the operand is a complex expression, we need a temp to avoid
      // double execution of the expression.
      if (operand.type !== 'IDENTIFIER_EXPRESSION') {
        operand = this.insertVariableFor(operand);
      }
      
      // window.__qp.setTracedPropertyObject(ourObj, <propertyKey>, tracedObjectIndex);
      var objectCheck = 
        createExpressionStatement(
          createCallExpression(
            createMemberExpression('window', '__qp', 'setTracedPropertyObject'),
            createArgumentList(
              operand, 
              createStringLiteral(this.propertyKey),
              createNumberLiteral(tracedObjectIndex)
            )
          )
        );
       objectCheck.doNotTransform = true;
       this.insertions.push(objectCheck);
       return operand;
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
      
      // window.__qp.propertyChanges.<propertyKey> = [];
      var propertyChangesMemberInitialization = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges', this.propertyKey),
          createArrayLiteralExpression([])
         );
      
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

  var ValueChangeQueryTransformer = Querypoint.ValueChangeQueryTransformer = function(propertyKey) {
    Querypoint.InsertVariableForExpressionTransformer.call(this);
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
    
    transformTree: function(tree) {
      if (!tree.hasValueChangeTransform) {
        // This transform is generic to all value-change tracing
        tree = this.transformAny(tree);
        tree.hasValueChangeTransform = true;
      }
      return tree;
    },

    transformAny: function(tree) {
      if (tree && !tree.doNotTransform)
        tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);

      return tree;
    },

    /**
     * ++obj.prop or ++obj[prop]  equiv to (obj.prop = obj.prop + 1) 
     * trace value: ++obj.prop;
     * @param {UnaryExpression} tree
     * @return {ParseTree}
     */
    transformUnaryExpression: function(tree) {
      if (tree.operator.type === TokenType.PLUS_PLUS || tree.operator.type === TokenType.MINUS_MINUS) {
        throw new Error('ValueChangeQueryTransformer should never see unary ++ or --');
      }
      return tree;  
    },

    /**
      obj.prop++ or obj[prop]++  equiv to tmp = obj.prop; obj.prop = tmp + 1;
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
      // else assignment, LHS = *= += etc RHS, RHS is simply an identifier

      // The left side should be a reference tree
      if (!tree.left.isReferenceTree)
        throw new Error('ValueChangeQueryTransformer expected reference tree');

      // Create the reference info according to the type of tree
      var left = this.transformAny(tree.left);
      
      // Output the write-barrier
      if (left.reference) { 
        this.insertions.push(this.trace(left, tree.right, tree.right.location));   
      } else {
        if (debug)
          console.warn("ValueChangeQueryTransformer missing tree reference TODO");
      }

      return new BinaryOperator(tree.location, left, tree.operator, tree.right);
    },

    transformMemberExpression: function(tree) {
      if (tree.isReferenceTree) {
        // eg obj.field => obj['field']
        var memberExpression = new LiteralExpression(
          tree.memberName.location, 
          createStringLiteralToken(tree.memberName.value)
        );
         tree.reference = {
            base: tree.operand,
            name: memberExpression
          };
      }

      return tree;
    },

    /**
     * obj[string]
     * @param {MemberLookupExpression} tree
     * @return {ParseTree}
     */
    transformMemberLookupExpression: function(tree) {
      if (tree.isReferenceTree) {
         tree.reference = {
            base: tree.operand,
            name: tree.memberExpression
          };
      }

      return tree;
    },
    
    // TODO transformVariableDeclaration for vars

    trace: function(tree, valueTree, traceLocation) {
      return propertyChangeTrace(tree.reference.base, tree.reference.name, valueTree, traceLocation);
    },

  };

}());