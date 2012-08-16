// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPIdentifierVisitor = (function() {
  'use strict';

  var debug = true;

  var ParseTreeVisitor = traceur.syntax.ParseTreeVisitor;
  var ParseTreeType = traceur.syntax.trees.ParseTreeType;
  
  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var Trees = traceur.syntax.trees;
  var TokenType = traceur.syntax.TokenType;
  
  var createTrueLiteral = ParseTreeFactory.createTrueLiteral;
  var createFalseLiteral = ParseTreeFactory.createFalseLiteral;
  
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
  
  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;

  /**
   * @extends {ParseTreeVisitor}
   * @constructor
   */
  function QPIdentifierVisitor(identifierQueries) {
    this.identifierQueries = identifierQueries || {};
    this.traceStack = []; 
  }

  QPIdentifierVisitor.visitTree = function(tree, visiter) {
    if (debug) { 
      console.log('QPIdentifierVisitor input:\n' + 
        traceur.outputgeneration.TreeWriter.write(tree));
    }
    var output_tree = visiter.visitAny(tree);
    if (debug) {
      console.log('QPIdentifierVisitor output:\n' + 
        traceur.outputgeneration.TreeWriter.write(output_tree));
    }
    return output_tree;
  };

  // This visit assumes Linearizevisit already applied.

  QPIdentifierVisitor.prototype = traceur.createObject(
    ParseTreeVisitor.prototype, {

      visitAny: function(tree) {
        var output_tree = 
          ParseTreeVisitor.prototype.visitAny.call(this, tree);
        if (tree) console.log('QPIdentifierVisitor ' + tree.type);
        if (output_tree) {
          ParseTreeValidator.validate(output_tree);
        }
        return output_tree;
      },

      /**
       * @param {BindingIdentifier} tree
       * @return {ParseTree}
       */
      visitBindingIdentifier: function(tree) {
        var id = tree.identifierToken.value;
        console.log(tree.type + ' id ' + id);
        if (this.identifierQueries.hasOwnProperty(id)) {
            console.log('Matched ' + tree.type + ' id ' + id);
            this.identifierHit = id;
        }
        return tree;
      },
      
      maybeTraceLocation: function(tree) {
        if (this.identifierHit) { 
          var qp = this.identifierQueries[this.identifierHit];
          qp.traceLocations.push({type: tree.type, location: tree.location});
        }
      },
      
      /**
       * @param {VariableDeclaration} tree
       * @return {ParseTree}
       */
      visitVariableDeclaration: function(tree) {
        var lvalue = this.visitAny(tree.lvalue);
        
        //this.maybeTraceLocation(tree);  // if the lvalue is traced
                
        var initializer = this.visitAny(tree.initializer);
        return tree;
      },
      
      /**
       * @param {ObjectLiteralExpression} tree
       * @return {ParseTree}
       */
      visitObjectLiteralExpression: function(tree) {
        this.maybeTraceLocation(tree)  // if we are ref-ed by a traced identifier.
        var propertyNameAndValues = this.visitList(tree.propertyNameAndValues);
        return tree;
      },
      
      /**
       * @param {traceur.syntax.trees.NewExpression} tree
       */
      visitNewExpression: function(tree) {
        this.maybeTraceLocation(tree);  // if we are ref-ed by a trace identifier
        this.visitAny(tree.operand);    // TODO tracing operand identifiers
        this.visitAny(tree.args);       // TODO arguments
      },
      
  });

  return QPIdentifierVisitor;

}());
