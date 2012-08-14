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

  var Analyzer = traceur.semantics.Analyzer;
  var ExportVisitor = traceur.codegeneration.module.ExportVisitor;
  var ImportStarVisitor = traceur.codegeneration.module.ImportStarVisitor;
  var ModuleDeclarationVisitor = traceur.codegeneration.module.ModuleDeclarationVisitor;
  var ModuleDefinitionVisitor = traceur.codegeneration.module.ModuleDefinitionVisitor;
  var ValidationVisitor = traceur.codegeneration.module.ValidationVisitor;

  // TODO(arv): Validate that there are no free variables
  // TODO(arv): Validate that the exported reference exists

  /**
   * Builds up all module symbols and validates them.
   *
   * @param {ErrorReporter} reporter
   * @param {Project} project
   * @constructor
   */
  function ModuleAnalyzer(reporter, project) {
    Analyzer.call(this, project);
    
    var visitors = this.visitors_ = [];
    function addVisitor(ctor) {
      visitors.push(new ctor(reporter, project, project.getRootModule()));
    }

    addVisitor(ModuleDefinitionVisitor);
    addVisitor(ExportVisitor);
    addVisitor(ModuleDeclarationVisitor);
    addVisitor(ValidationVisitor);
    addVisitor(ImportStarVisitor);
  }
  
  ModuleAnalyzer.prototype = traceur.createObject(
    Analyzer.prototype, {
      getVisitors: function() {
        return this.visitors_;
      }
    }
  );

  return {
    ModuleAnalyzer: ModuleAnalyzer
  };
});
