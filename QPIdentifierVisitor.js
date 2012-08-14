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
    this.identifierGenerator_ = new traceur.codegeneration.UniqueIdentifierGenerator();
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
       * @param {Array.<ParseTree>} list
       * @return {Array.<ParseTree>}
       */
      visitList: function(list) {
        if (list == null || list.length == 0) {
          return list;
        }

        var builder = null;

        for (var index = 0; index < list.length; index++) {
          var element = list[index];
          var visited = this.visitAny(element);

          if (builder != null || element != visited || this.traceStack.length) {
            if (builder == null) {
              builder = list.slice(0, index);
            }
            builder.push(visited);
            if (this.traceStack.length) {
              visited.traceInfo = this.traceStack.slice(0);
              this.traceStack = [];
            }
          }
        }

        return builder || list;
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
      
      /**
       * @param {VariableDeclaration} tree
       * @return {ParseTree}
       */
      visitVariableDeclaration: function(tree) {
        var lvalue = this.visitAny(tree.lvalue);
        
        if (this.identifierHit) { // The lvalue is traced
            this.identifierQueries[this.identifierHit].push({type: tree.type, location: tree.location});
        }
        
        var initializer = this.visitAny(tree.initializer);
        return tree;
      },
      
      /**
       * @param {ObjectLiteralExpression} tree
       * @return {ParseTree}
       */
      visitObjectLiteralExpression: function(tree) {
        if (this.identifierHit) {  // we are ref-ed by a traced identifier.
          this.identifierQueries[this.identifierHit].push({type: tree.type, location: tree.location});
        }
        var propertyNameAndValues = this.visitList(tree.propertyNameAndValues);
        return tree;
      },

      /**
       * @param {VariableStatement} tree
       * @return {ParseTree}
       */
      visitVariableStatement: function(tree) {
        var declarations = this.visitAny(tree.declarations);
        if (this.identifierHit) {
            // Prepare the static info for dynamic us
            this.traceStack.push(this.identifierQueries[this.identifierHit]);
            delete this.identifierHit;
        }
        return tree;
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
      
  });

  return QPIdentifierVisitor;

}());
