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
 
  var PredefinedName = traceur.syntax.PredefinedName;
  var TokenType = traceur.syntax.TokenType;
  var Program = traceur.syntax.trees.Program;
  var ParseTreeVisitor = traceur.syntax.ParseTreeVisitor;

  /*
    Trace expressions that change object property values.
    obj.prop = value;
    obj[prop] = value;  // for all kinds of assignment
    obj.prop++           
    obj[prop]++         // for all unary operators
    obj = {prop: value}
  */

  function PropertyChangeTrace(objectExpression, propertyExpression) {
    this.objectExpression = objectExpression;
    this.propertyExpression = propertyExpression;
  }

  PropertyChangeTrace.prototype = {
    traceStatements: function() {
      console.error("need to emit traceStatements");
    }
  };

   /**
     Find trees matching propertyIdentifier. Called when we want to scan the LHS of an assignment.
    */

  function PropertyReferenceVisitor(propertyIdentifier) {
    ParseTreeVisitor.call(this);
    this.propertyIdentifier = propertyIdentifier;
  }

  PropertyReferenceVisitor.prototype = {
    __proto__: ParseTreeVisitor.prototype,

    visitAny: function(tree) {
      delete this.propertyChangeTrace;
      ParseTreeVisitor.prototype.visitAny.call(this);
      return this.propertyChangeTrace;  // may be undefined
    },

    visitObjectLiteralExpression: function(tree) {
      var propertyNameAndValues = this.transformList(tree.propertyNameAndValues);
      if (propertyNameAndValues == tree.propertyNameAndValues) {
        return tree;
      }
      return new ObjectLiteralExpression(tree.location, propertyNameAndValues);
    },

    /**
     * name: value
     * @param {PropertyNameAssignment} tree
     * @return {ParseTree}
     */
    visitPropertyNameAssignment: function(tree) {
      var value = this.transformAny(tree.value);
      if (value == tree.value) {
        return tree;
      }
      return new PropertyNameAssignment(tree.location, tree.name, value);
    },

    /**
     * obj.prop
     * @param {MemberExpression} tree
     * @return {ParseTree}
     */
    visitMemberExpression: function(tree) {
      if (tree.memberName.value === this.propertyIdentifier.value) {
        this.propertyChangeTrace = new PropertyChangeTrace(operand, tree.memberName);
      }
      // Since we are called after linearize we don't need to recurse
    },

    /**
     * obj[string]
     * @param {MemberLookupExpression} tree
     * @return {ParseTree}
     */
    transformMemberLookupExpression: function(tree) {
       this.propertyChangeTrace = new PropertyChangeTrace(operand, tree.memberExpression);
    },

    _createPropertyChangeAccessExpression: function(propertyIdentifier) {
      // window.__qp.propertyChanges.<propertyIdentifier>
      return createMemberLookupExpression(
        createMemberExpression('window', '__qp', 'propertyChanges'),
        createStringLiteral(propertyIdentifier)
      );
    },
  };


  var ValueChangeQueryTransformer = Querypoint.ValueChangeQueryTransformer = function(propertyIdentifier) {
    Querypoint.InsertingTransformer.call(this);
    this.propertyIdentifier = propertyIdentifier;
    this.visitor = new PropertyReferenceVisitor(propertyIdentifier);
  }

  var QP_FUNCTION = '__qp_function';


    /**
     * obj = {name: value}
     * @param {ObjectLiteralExpression} tree
     * @return {ParseTree}
     */
  ValueChangeQueryTransformer.prototype = {
    __proto__: Querypoint.InsertingTransformer.prototype,

    transformAny: function(tree) {
      if (!tree || !tree.location) return tree;
      return ParseTreeTransformer.prototype.transformAny.call(this, tree);
    },

    /**
     * obj.prop++ or obj[prop]++  equiv to obj.prop += 1
     * operand contains only linearization temps
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
      var left = this.transformAny(tree.left);
      var traceable = this.visitor.visitAny(left);
      if (traceable) {
        this.insertions.push(traceable.traceStatements());
      }
      var right = this.transformAny(tree.right);
      if (left == tree.left && right == tree.right) {
        return tree;
      }
      return new BinaryOperator(tree.location, left, tree.operator, right);
    },
    
     // Called once per load by QPRuntime
    runtimeInitializationStatements: function(tree) {
      // window.__qp.propertyChanges = { <propertyIdentifier>: [] };
      var statement = 
        createAssignmentStatement(
          createMemberExpression('window', '__qp', 'propertyChanges'),
          createObjectLiteralExpression(
            createPropertyNameAssignment(
             propertyIdentifier, 
             createArrayLiteralExpression([])
           )
         )
       );
      return [statement];
    },

  };

}());
