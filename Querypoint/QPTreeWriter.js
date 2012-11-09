// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var QPTreeWriter = (function() {
  'use strict';
  
  var debug = false;

  var ParseTreeMapWriter = traceur.outputgeneration.ParseTreeMapWriter;
  var SourceMapGenerator = traceur.outputgeneration.SourceMapGenerator;

  var ParseTreeFactory = traceur.codegeneration.ParseTreeFactory;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;
  var createMemberExpression = ParseTreeFactory.createMemberExpression;
  var createCallExpression = ParseTreeFactory.createCallExpression;
  var createArgumentList = ParseTreeFactory.createArgumentList;
  var createAssignmentStatement = ParseTreeFactory.createAssignmentStatement;
  var createParenExpression = ParseTreeFactory.createParenExpression;
  var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;
  var createAssignmentExpression = ParseTreeFactory.createAssignmentExpression;

  var Trees = traceur.syntax.trees;
  var CommaExpression = Trees.CommaExpression;

  // For dev
  var ParseTreeValidator = traceur.syntax.ParseTreeValidator;

  // Constant
  var activationId = '__qp_activation';

    /**
   * Converts a ParseTree to text and a source Map
   * @param {ParseTree} highlighted
   * @param {boolean} showLineNumbers
   * @param { {SourceMapGenerator} sourceMapGenerator
   * @constructor
   */
  function QPTreeWriter(generatedSourceName, tracequeries) {
    var config = {file: generatedSourceName};
    this.sourceMapGenerator = new SourceMapGenerator(config);
    ParseTreeMapWriter.call(this, false, false, this.sourceMapGenerator);
    
    this._tracequeries = tracequeries;
  }


  QPTreeWriter.prototype = traceur.createObject(
      ParseTreeMapWriter.prototype, {

        generateSource: function(file, tree) {
          this.visitAny(tree);
          if (this.currentLine_.length > 0) {
            this.writeln_();
          }
          // TODO looks like this is a method of sourceFile
          file.sourceMap = this.sourceMapGenerator.toString();
          file.generatedSource = this.result_.toString();
          return file;
        },
        
        visitIdentifierExpression: function(tree) {
          // Linearizer has marked the expressions we need to trace with .trace
          if (tree.traceIdentifier) {
            tree = this.traceIdentifierExpression(tree);
            return ParseTreeMapWriter.prototype.visitParenExpression.call(this, tree);
          } 
          return ParseTreeMapWriter.prototype.visitIdentifierExpression.call(this, tree);
        },

        traceIdentifierExpression: function(tree) {
          
          var traceId = tree.traceIdentifier;
          delete tree.traceIdentifier;
          
          // (__qp_activation._offset = window.__qp.trace(__qp_XX))
          var traceExpression = createParenExpression(
            createAssignmentExpression(
              createMemberExpression(
                createIdentifierExpression(activationId),
                traceId
              ),
              createCallExpression(
                createMemberExpression('window', '__qp','trace'),
                createArgumentList(
                  tree
                )                    
              )
            )
          );
          
          // (__qp_activation.<offset> = window.__qp.trace(__qp_XX)), __qp_XX
          
          var traceExpression = createParenExpression(
            new CommaExpression(
              tree.location,
              [
                traceExpression,
                tree
              ]  
            )
          );
         
  ParseTreeValidator.validate(traceExpression); 
          return traceExpression;
        }

  });

  return QPTreeWriter;

})();