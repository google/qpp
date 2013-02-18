// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPIdentifierVisitor = (function() {
  'use strict';

  var debug = DebugLogger.register('QPIdentifierVisitor', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

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
  
  function transformed(tree) {
    console.error("Tree should have been transformed away");
  }

  /**
   * @extends {ParseTreeVisitor}
   * @constructor
   */
  function QPIdentifierVisitor(identifierQueries) {
    this.identifierQueries = identifierQueries || {};
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

  // This visit assumes LinearizeTransform already applied.

  QPIdentifierVisitor.prototype = {
    __proto__: ParseTreeVisitor.prototype, 

    walkHome: function(tree, fncOfTree) {
      while(tree) {
        fncOfTree(tree);
        tree = tree.parentTree;
      }
    },

    talkHome: function(tree, field) {
      var str = [];
      this.walkHome(tree, function(tree) {
        str.push(field ? tree[field] : tree);
      });
      return str;
    },

    visitAny: function(tree) {
      if (tree) {
        tree.parentTree = this.parentTree;
        this.parentTree = tree;
        ParseTreeVisitor.prototype.visitAny.call(this, tree);
        if (tree) console.log('QPIdentifierVisitor ', this.talkHome(tree, 'type'));
        this.parentTree = tree.parentTree;
      }
    },

    visitArgumentList: function(tree) {
      this.visitList(tree.args);
      this.maybeTraceLocation(tree);
    },

    visitArrayComprehension: transformed,
    visitArrowFunctionExpression: transformed,
    visitAwaitStatement: transformed, 
    // visitBinaryOperator no identifier
    visitBindThisParameter: transformed,
    visitBindingElement: transformed,
    // visitBlock no identifier
          


    checkIdentifier: function(id) {
      if (id) {
        console.log('checking id ' + id);
        if (this.identifierQueries.hasOwnProperty(id)) {
          console.log('Matched id ' + id);
          this.identifierHit = id;
        } else {
          delete this.identifierHit;
        }
      }
    },

    /**
     * @param {BindingIdentifier} tree
     * @return {ParseTree}
     */
    visitBindingIdentifier: function(tree) {
      this.checkIdentifier(tree.identifierToken.value);
    },
    
    visitIdentifierExpression: function(tree) {
      this.checkIdentifier(tree.identifierToken.value);
    },
    
    maybeTraceLocation: function(tree) {
      if (this.identifierHit) { 
        var tq = this.identifierQueries[this.identifierHit];
        if (tree.location && tree.location.start) { 
          tq.traceLocations.push(tree.location);
        } else {
          console.error("maybeTraceLocation: no location for ", this.talkHome(tree, 'type'));
        }
      }
    },
    
    /**
     * @param {VariableDeclaration} tree
     * @return {ParseTree}
     */
    visitVariableDeclaration: function(tree) {
      var lvalue = this.visitAny(tree.lvalue);
      
      console.log("variable declaration rhs type: ", tree.initializer ? tree.initializer.type : "none");
      this.maybeTraceLocation(tree);
              
      var initializer = this.visitAny(tree.initializer);
      return tree;
    },
      
  };

  return QPIdentifierVisitor;

}());
