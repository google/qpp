// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

traceur.define('semantics', function() {
  'use strict';

  /**
   * Base class for Analyzers
   *
   * @param {ErrorReporter} reporter
   * @param {Project} project
   * @constructor
   */
  function Analyzer(project) {
    this.project_ = project;
  }

  Analyzer.prototype = {
    /**
     * @return {void}
     */
    analyze: function() {
      this.analyzeTrees(this.project_.getSourceTrees());
    },

    /**
     * @param {SourceFile} sourceFile
     * @return {void}
     */
    analyzeFile: function(sourceFile) {
      var trees = [this.project_.getParseTree(sourceFile)];
      this.analyzeTrees(trees);
    },

    /**
     * @param {Array.<ParseTree>} trees
     * @return {void}
     */
    analyzeTrees: function(trees) {
      var visitors = this.getVisitors();
      visitors.forEach(function (visitor){
        trees.forEach(function(tree) {
          visitor.visitAny(tree);
        });
      });
    },

    /**
     * @param {Array.<ParseTreeVisitor>} 
     * @return {void}
     */
    getVisitors: function() {
      console.error("TODO: Implement in derived class")
    }
  };

  return {
    Analyzer: Analyzer
  };
});
