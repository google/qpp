// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

(function(){
  
  window.Querypoint = window.Querypoint || {};
  
  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var createMemberExpression = ParseTreeFactory.createMemberExpression;
  var createMemberLookupExpression = ParseTreeFactory.createMemberLookupExpression;
  var createPropertyNameAssignment = ParseTreeFactory.createPropertyNameAssignment;
  var createStringLiteral = ParseTreeFactory.createStringLiteral;
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
 
  var PredefinedName = traceur.syntax.PredefinedName;
  var TokenType = traceur.syntax.TokenType;
  var Trees = traceur.syntax.trees;
  var Program = Trees.Program;
  var BinaryOperator = Trees.BinaryOperator;
  var MemberLookupExpression = Trees.MemberLookupExpression;
  var MemberExpression = Trees.MemberExpression;
  var UnaryExpression = Trees.UnaryExpression;
  
    // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;
  var debug = true;
  
  /*
    Trace expressions that change object property values.
    obj.prop = value;
    obj[prop] = value;  // for all kinds of assignment
    obj.prop++           
    obj[prop]++         // for all unary operators
    obj = {prop: value}
  */

  function propertyChangeStatement(objectExpression, tracePropertyKey, valueTree, traceLocation) {
      // I suppose we may want to point at the obj.prop expression, but let's try the value first
      var traceStart = traceLocation.start.offset; 
      var traceEnd = traceLocation.end.offset;
      var traceFile = traceLocation.start.source.name;
      // window.__qp.propertyChanges.<propertyId>.push({obj: <objExpr>, prop: <propExpr>, ...)
      var statement =
        createExpressionStatement(
          createCallExpression( 
            createMemberExpression('window', '__qp','propertyChanges', tracePropertyKey, 'push'),
            createArgumentList(
              createObjectLiteralExpression([
                createPropertyNameAssignment('obj', objectExpression),
                createPropertyNameAssignment('property', createStringLiteral(tracePropertyKey)),
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
        if (debug) ParseTreeValidator.validate(statement);
        return statement;         
  };
  
  function propertyChangeTrace(objectExpression, memberExpression, tracePropertyKey, valueTree, traceLocation) {
      // if (memberExpression === tracePropertyKey) { trace };
      var traceStatement = propertyChangeStatement(objectExpression, tracePropertyKey, valueTree, traceLocation);
      if (memberExpression.literalToken && memberExpression.literalToken.processedValue === tracePropertyKey) {
        return traceStatement;
      } else {
        var ifStatement =
          ParseTreeFactory.createIfStatement(
            createBinaryOperator(
              memberExpression, 
              createOperatorToken(TokenType.EQUAL_EQUAL_EQUAL), 
              createStringLiteral(tracePropertyKey)
            ),
            traceStatement
          );
        if (debug) ParseTreeValidator.validate(ifStatement);
        return ifStatement;
      }
  };
  
   /**
     Transform property references to use temporary vars and (optionally) create trace statements.
     References occur on the LHS of assignments.
    */

  function PropertyReferenceTransformer(propertyKey, generateFileName) {
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.propertyKey = propertyKey;
  }

  PropertyReferenceTransformer.prototype = {
    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,

    transformAny: function(tree) {
      var tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);
      if (debug) ParseTreeValidator.validate(tree);
      return tree;
    },


  };


  var ValueChangeQueryTransformer = Querypoint.ValueChangeQueryTransformer = function(propertyKey, generateFileName, tree) {
    this.generateFileName = generateFileName;
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.propertyKey = propertyKey;
    this.objectCheckTree = tree;
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
      this.isObjectCheckTree = (tree === this.objectCheckTree);
      tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);
      this.isObjectCheckTree = false;
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
        return tree;
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
        // Create a temp for the RHS to avoid double calls when we trace.
        right = this.insertVariableFor(right);  
        this.insertions.push(this.trace(right, tree.right.location)); 
      }

      if (left == tree.left && right == tree.right) {
        return tree;
      } else {
        return new BinaryOperator(tree.location, left, tree.operator, right);  
      }
    },
        
    _insertObjectCheck: function(tree) {
      // We are at the object reference tree where we need to check if other traces for
      // the property used the required object.
      // If the tree is a complex expression, we need a temp to avoid
      // double execution of the expression.
      tree = Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);
      
      if (tree.type !== 'IDENTIFIER_EXPRESSION') {
        tree = this.insertVariableFor(tree);
      }
      
      // window.__qp.reducePropertyChangesToOurObject(ourObj, <propertyKey>);
      var objectCheck = 
        createExpressionStatement(
          createCallExpression(
            createMemberExpression('window', '__qp', 'reducePropertyChangesToOurObject'),
            createArgumentList(
              tree, 
              createStringLiteral(this.propertyKey)
            )
          )
        );
       this.insertions.push(objectCheck);
       return tree;
    },

    transformMemberExpression: function(tree) {
      if (this.isReferenceTree) {  
        // we can test for the traced property name at compile time.
        if (tree.memberName.value === this.propertyKey) { 
          var operand = this.insertVariableFor(tree.operand);
          this.reference = {
            base: operand,
            name: createStringLiteral(this.propertyKey)
          };
          tree = new MemberExpression(tree.location, operand, tree.memberName);
        }  // else we aren't tracing this property
      } // else this member expr does not appear on the RHS of assignment
       
      if (this.isObjectCheckTree) {
        var operand = this._insertObjectCheck(tree.operand);
        tree = new MemberExpression(tree.location, operand, tree.memberName);
      }

      return tree;
    },
    
    /**
     * obj[string]
     * @param {MemberLookupExpression} tree
     * @return {ParseTree}
     */
    transformMemberLookupExpression: function(tree) {
      if (this.isReferenceTree) {
         // we don't know until runtime if this property will be traced.
         // simplify the components
         var operand = this.insertVariableFor(tree.operand);
         var memberExpression = this.insertVariableFor(tree.memberExpression);
         this.reference = {
            base: operand,
            name: memberExpression
          };
         tree = new MemberLookupExpression(tree.location, operand, memberExpression);
      }
      if (this.isObjectCheckTree) {
        var operand = this._insertObjectCheck(tree.operand);
        tree = new MemberLookupExpression(tree.location, operand, tree.memberExpression);
      }
        
      return tree;
    },

    trace: function(valueTree, traceLocation) {
      return propertyChangeTrace(this.reference.base, this.reference.name, this.propertyKey, valueTree, traceLocation);
    },

    
     // Called once per load by QPRuntime
    runtimeInitializationStatements: function() {
      // window.__qp.propertyChanges = { <propertyKey>: [] };
      var statement = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges'),
          createObjectLiteralExpression(
            createPropertyNameAssignment(
             this.propertyKey, 
             createArrayLiteralExpression([])
           )
         )
       );
      return statement;
    },

  };

}());
