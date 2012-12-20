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
        ParseTreeFactory.createExpressionStatement(
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
        ParseTreeValidator.validate(statement);
        return statement;         
  };
  
  function propertyChangeTrace(objectExpression, memberExpression, tracePropertyKey, valueTree, traceLocation) {
      // if (memberExpression === tracePropertyKey) { trace };
      var ifStatement =
        ParseTreeFactory.createIfStatement(
            createBinaryOperator(
              memberExpression, 
              createOperatorToken(TokenType.EQUAL_EQUAL_EQUAL), 
              createStringLiteral(tracePropertyKey)
            ),
            propertyChangeStatement(objectExpression, tracePropertyKey, valueTree, traceLocation)
        );
      ParseTreeValidator.validate(ifStatement);
      return ifStatement;
  };
  
   /**
     Transform property references to use temporary vars and create trace statements.
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
      ParseTreeValidator.validate(tree);
      return tree;
    },

    /**
     * obj.prop
     * @param {MemberExpression} tree
     * @return {ParseTree}
     */
    transformMemberExpression: function(tree) {
      // we can test for the traced property name at compile time.
      if (tree.memberName.value === this.propertyKey) { 
        var operand = this.insertVariableFor(tree.operand);
        this.reference = {
          base: operand,
          name: createStringLiteral(this.propertyKey)
        };
        return new MemberExpression(tree.location, operand, tree.memberName);
      } else {
        return tree;
      }
    },
    
    /**
     * obj[string]
     * @param {MemberLookupExpression} tree
     * @return {ParseTree}
     */
    transformMemberLookupExpression: function(tree) {
       // we don't know until runtime if this property will be traced.
       // simplify the components
       var operand = this.insertVariableFor(tree.operand);
       var memberExpression = this.insertVariableFor(tree.memberExpression);
       this.reference = {
          base: operand,
          name: memberExpression
        };
       return new MemberLookupExpression(tree.location, operand, memberExpression);
    },

    trace: function(valueTree, traceLocation) {
      return propertyChangeTrace(this.reference.base, this.reference.name, this.propertyKey, valueTree, traceLocation);
    }

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
      var propertyReferenceTransformer = new PropertyReferenceTransformer(this.propertyKey, this.generateFileName);
      var operand = this.transformAny(tree.operand);
      operand = propertyReferenceTransformer.transformAny(operand);
      if (operand !== tree.operand) { // then the operand had a property access
        // We have operand as tmp1[tmp2]
        // insert the temporaries for the property access operation
        this.insertions = this.insertions.concat(propertyReferenceTransformer.insertions);
        // Use the temporary vars in a new expression, eg ++tmp1[tmp2]
        var unaryExpression = new UnaryExpression(tree.location, tree.operator, operand);
        // insert a temporary for the expression so we can trace it without double operations
        unaryExpression = this.insertVariableFor(unaryExpression);
        // Finally insert the tracing statement  
        this.insertions.push(propertyReferenceTransformer.trace(unaryExpression, tree.location));
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
        return Querypoint.InsertVariableForExpressionTransformer.prototype.transformBinaryOperator(tree);
      }
      var left = this.transformAny(tree.left); // process subexpressions ? Maybe RHS cannot have them 

      // create a temp for the RHS so we can reference the temp both in the trace and the binary expression without double calls 

      var propertyReferenceTransformer = new PropertyReferenceTransformer(this.propertyKey, this.generateFileName);
      var left = propertyReferenceTransformer.transformAny(left);
      
      var right = this.transformAny(tree.right);
      if (left !== tree.left) { // Then we found something we want to trace
        // Place the temporary variable statement for the lhs above the binary operator expression.
        this.insertions = this.insertions.concat(propertyReferenceTransformer.insertions);
        // Create a temp for the RHS to avoid double calls when we trace.
        right = this.insertVariableFor(right);  
        this.insertions.push(propertyReferenceTransformer.trace(right, tree.right.location)); 
      }

      if (left == tree.left && right == tree.right) {
        return tree;
      } else {
        return new BinaryOperator(tree.location, left, tree.operator, right);  
      }
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
