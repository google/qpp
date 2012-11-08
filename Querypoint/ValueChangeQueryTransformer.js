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

  /*
    Trace expressions that change object property values.
    obj.prop = value;
    obj[prop] = value;  // for all kinds of assignment
    obj.prop++           
    obj[prop]++         // for all unary operators
    obj = {prop: value}
  */


  var ValueChangeQueryTransformer = Querypoint.ValueChangeQueryTransformer = function(propertyIdentifier) {
    ParseTreeTransformer.call(this);
    this.propertyIdentifier = propertyIdentifier;
  }

  var QP_FUNCTION = '__qp_function';

  // Called once per load by QPRuntime
  ValueChangeQueryTransformer.runtimeInitializationStatements = function(tree) {
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
  }


    /**
     * obj = {name: value}
     * @param {ObjectLiteralExpression} tree
     * @return {ParseTree}
     */
  ValueChangeQueryTransformer.prototype = {
    __proto__: ParseTreeTransformer.prototype,

    transformAny: function(tree) {
      if (!tree || !tree.location) return tree;
      ParseTreeTransformer.prototype.transformAny.call(this, tree);
    },

    transformObjectLiteralExpression: function(tree) {
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
    transformPropertyNameAssignment: function(tree) {
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
    transformMemberExpression: function(tree) {
      var operand = this.transformAny(tree.operand);
      this._propertyWas = tree.memberName;
      if (operand == tree.operand) {
        return tree;
      }
      return new MemberExpression(tree.location, operand, tree.memberName);
    },

    /**
     * obj[string]
     * @param {MemberLookupExpression} tree
     * @return {ParseTree}
     */
    transformMemberLookupExpression: function(tree) {

      this._propertyWas = tree.memberExpression;
      this._objectWas = tree.operand;
      return tree;
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
        delete thils._objectWas;
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
      var right = this.transformAny(tree.right);
      if (left == tree.left && right == tree.right) {
        return tree;
      }
      return new BinaryOperator(tree.location, left, tree.operator, right);
    },


    _createPropertyChangeAccessExpression: function(propertyIdentifier) {
      // window.__qp.propertyChanges.<propertyIdentifier>
      return createMemberLookupExpression(
        createMemberExpression('window', '__qp', 'propertyChanges'),
        createStringLiteral(propertyIdentifier)
      );
    }
  };

}());
