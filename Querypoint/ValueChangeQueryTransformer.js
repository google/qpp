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
 
  var PredefinedName = traceur.syntax.PredefinedName;
  var TokenType = traceur.syntax.TokenType;
  var Trees = traceur.syntax.trees;
  var Program = Trees.Program;
  var BinaryOperator = Trees.BinaryOperator;

  /*
    Trace expressions that change object property values.
    obj.prop = value;
    obj[prop] = value;  // for all kinds of assignment
    obj.prop++           
    obj[prop]++         // for all unary operators
    obj = {prop: value}
  */

  function propertyChangeStatement(propertyIdentifier, objectExpression, rhs) {
    this.propertyIdentifier = propertyIdentifier;
    this.objectExpression = objectExpression; 
      // window.__qp.propertyChanges.<propertyId>.push({obj: <objExpr>, prop: <propExpr>, ...)
      var statement =
        ParseTreeFactory.createExpressionStatement(
          createCallExpression( 
            createMemberExpression('window', '__qp','propertyChanges', this.propertyIdentifier, 'push'),
            createArgumentList(
              createObjectLiteralExpression([
                createPropertyNameAssignment('obj', this.objectExpression),
                createPropertyNameAssignment('property', createStringLiteral(this.propertyIdentifier)),
                createPropertyNameAssignment('activations', createIdentifierExpression('__qp_function')),
                createPropertyNameAssignment('activationIndex', createMemberExpression('__qp_function', 'length')),
                createPropertyNameAssignment('value', rhs),
              ])
            )
          )
        );
        return statement;         
  };

   /**
     Find trees matching propertyIdentifier. Called when we want to scan the LHS of an assignment.
    */

  function PropertyReferenceTransformer(propertyIdentifier, generateFileName, rhsTransformer) {
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.propertyIdentifier = propertyIdentifier;
    this.rhsTransformer = rhsTransformer;
  }

  PropertyReferenceTransformer.prototype = {
    __proto__: Querypoint.InsertVariableForExpressionTransformer.prototype,

    transformAny: function(tree) {
      Querypoint.InsertVariableForExpressionTransformer.prototype.transformAny.call(this, tree);
    },

    /**
     * obj.prop
     * @param {MemberExpression} tree
     * @return {ParseTree}
     */
    transformMemberExpression: function(tree) {
      // we can test for the traced property name at compile time.
      if (tree.memberName.value === this.propertyIdentifier.value) { 
        // simplify the rhs
        var rhs = this.rhsTransformer(tree.right);
        var operand = this.insertVariableFor(tree.operand);
        this.traceStatement = propertyChangeStatement(
          this.propertyIdentifier.value,   // prop
          operand,                          // obj
          rhs
        );
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
       var rhs = this.rhsTransformer(tree.right);
       this.traceStatement = propertyChangeStatement(
          this.propertyIdentifier.value,   // prop
          operand ,                         // obj
          rhs
        );
       return new MemberLookupExpression(tree.location, operand, memberExpression);
    },

  };


  var ValueChangeQueryTransformer = Querypoint.ValueChangeQueryTransformer = function(propertyIdentifier, generateFileName) {
    this.generateFileName = generateFileName;
    Querypoint.InsertVariableForExpressionTransformer.call(this, generateFileName);
    this.propertyIdentifier = propertyIdentifier;
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
     * obj.prop++ or obj[prop]++  equiv to obj.prop += 1
     * @param {UnaryExpression} tree
     * @return {ParseTree}
     */
    transformUnaryExpression: function(tree) {
      var operand = this.transformAny(tree.operand);
      if (this._propertyWas) { // then our operand accessed an object property
        // operand++ -> (tmp = operand++, (_propertyWasId === propertyIdentifier) ? pushTrace(tmpObj, tmpPropName, tmp) :0), tmp) )

        delete this._propertyWas;  
        delete this._objectWas;
        return new UnaryExpression(tree.location, tree.operator, operand);
      }
      return tree;
    },

    /**
     * @param {BinaryOperator} tree
     * @return {ParseTree}
     */
    transformBinaryOperator: function(tree) {
      if (!tree.operator.isAssignmentOperator()) {
        return Querypoint.InsertVariableForExpressionTransformer.prototype.transformBinaryOperator(tree);
      }
      
      // create a temp for the RHS so we can reference the temp both in the trace and the binary expression without double calls 
      var right = tree.right;
      function createTempIfNeeded(right) {
          right = this.insertVariableFor(tree.right);
      }
      var propertyReferenceTransformer = new PropertyReferenceTransformer(this.propertyIdentifier, this.generateFileName);
      var left = propertyReferenceTransformer.transformAny(tree.left);
      
      // Place the temporary variable statement for the lhs above the binary operator expression.
      this.insertions.push(propertyReferenceTransformer.insertions);
      if (propertyReferenceTransformer.tracingStatements) {
        // finally push the tracing
        this.insertion.push(propertyReferenceTransformer.tracingStatement); 
      }

      if (left == tree.left && right == tree.right) {
        return tree;
      }
      return new BinaryOperator(tree.location, left, tree.operator, right);
    },
    
     // Called once per load by QPRuntime
    runtimeInitializationStatements: function() {
      // window.__qp.propertyChanges = { <propertyIdentifier>: [] };
      var statement = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges'),
          createObjectLiteralExpression(
            createPropertyNameAssignment(
             this.propertyIdentifier.value, 
             createArrayLiteralExpression([])
           )
         )
       );
      return statement;
    },

  };

}());
