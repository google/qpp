// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

traceur.outputgeneration.QPTransformer = (function() {
  'use strict';

  var debug = true;

  var ParseTreeTransformer = traceur.codegeneration.ParseTreeTransformer;
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
   * @extends {ParseTreeTransformer}
   * @constructor
   */
  function QPTransformer(identifierQueries) {
    this.identifierQueries = identifierQueries || {};
    this.traceStack = []; 
    this.identifierGenerator_ = new traceur.codegeneration.UniqueIdentifierGenerator();
  }

  QPTransformer.transformTree = function(tree, transformer) {
    if (debug) { 
      console.log('QPTransformer input:\n' + 
        traceur.outputgeneration.TreeWriter.write(tree));
    }
    var output_tree = transformer.transformAny(tree);
    if (debug) {
      console.log('QPTransformer output:\n' + 
        traceur.outputgeneration.TreeWriter.write(output_tree));
    }
    return output_tree;
  };

  // This transform assumes LinearizeTransform already applied.

  QPTransformer.prototype = traceur.createObject(
    ParseTreeTransformer.prototype, {

      transformAny: function(tree) {
        var output_tree = 
          ParseTreeTransformer.prototype.transformAny.call(this, tree);
        if (tree) console.log('QPTransformer ' + tree.type);
        if (output_tree) {
          ParseTreeValidator.validate(output_tree);
        }
        return output_tree;
      },
      
      /**
       * @param {Array.<ParseTree>} list
       * @return {Array.<ParseTree>}
       */
      transformList: function(list) {
        if (list == null || list.length == 0) {
          return list;
        }

        var builder = null;

        for (var index = 0; index < list.length; index++) {
          var element = list[index];
          var transformed = this.transformAny(element);

          if (builder != null || element != transformed || this.traceStack.length) {
            if (builder == null) {
              builder = list.slice(0, index);
            }
            builder.push(transformed);
            if (this.traceStack.length) {
              builder.push(this.traceStack.map(function(staticInfo) {
                console.log('staticInfo ', staticInfo);
              }));
            }
          }
        }

        return builder || list;
      },

      /**
       * @param {BindingIdentifier} tree
       * @return {ParseTree}
       */
      transformBindingIdentifier: function(tree) {
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
      transformVariableDeclaration: function(tree) {
        var lvalue = this.transformAny(tree.lvalue);
        
        if (this.identifierHit) { // The lvalue is traced
            this.identifierQueries[this.identifierHit].push({type: tree.type, location: tree.location});
        }
        
        var initializer = this.transformAny(tree.initializer);
        if (lvalue == tree.lvalue && initializer == tree.initializer) {
          return tree;
        }
        return new VariableDeclaration(tree.location, lvalue, initializer);
      },
      
      /**
       * @param {ObjectLiteralExpression} tree
       * @return {ParseTree}
       */
      transformObjectLiteralExpression: function(tree) {
        if (this.identifierHit) {  // we are ref-ed by a traced identifier.
          this.identifierQueries[this.identifierHit].push({type: tree.type, location: tree.location});
        }
        var propertyNameAndValues = this.transformList(tree.propertyNameAndValues);
        if (propertyNameAndValues == tree.propertyNameAndValues) {
          return tree;
        }
        return new ObjectLiteralExpression(tree.location, propertyNameAndValues);
      },

      /**
       * @param {VariableStatement} tree
       * @return {ParseTree}
       */
      transformVariableStatement: function(tree) {
        var declarations = this.transformAny(tree.declarations);
        if (this.identifierHit) {
            // Prepare the static info for dynamic us
            this.traceStack.push(this.identifierQueries[this.identifierHit]);
            delete this.identifierHit;
        }
        if (declarations == tree.declarations) {
          return tree;
        }
        return new VariableStatement(tree.location, declarations);
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

  return QPTransformer;

}());
