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


// A Project that can compile all of script elements in a page

var WebPageProject = (function() {
  'use strict';
  
  var Project = traceur.semantics.symbols.Project;

  function WebPageProject(url) {
    Project.call(this, url);
    this.numPending = 0;
  }

  WebPageProject.prototype =  traceur.createObject(
    Project.prototype, {

      _asyncLoad: function(url, fncOfContent) {
        this.numPending++;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.addEventListener('load', function(e) {
          if (xhr.status == 200 || xhr.status == 0) {
            fncOfContent(xhr.responseText);
          }
          this.numPending--;
          this.runScriptsIfNonePending_();
        }.bind(this), false);
        var onFailure = function() {
          this.numPending--;
          console.warn('Failed to load', url);
          this.runScriptsIfNonePending_();
        }.bind(this);
        xhr.addEventListener('error', onFailure, false);
        xhr.addEventListener('abort', onFailure, false);
        xhr.send();
      },

      addFileFromScriptElement: function(scriptElement, name, content) {
        var file = new traceur.syntax.SourceFile(name, content);
        file.scriptElement = scriptElement;
        this.addFile(file);
      },

      addFilesFromScriptElements: function(scriptElements) {
        var numberInlined = 0;
        for (var i = 0, length = scriptElements.length; i < length; i++) {
          var scriptElement = scriptElements[i];
          
          if (!scriptElement.src) {  
            numberInlined += 1;
            var segments = this.url.split('.');
            segments.pop();
            segments.push('_' + numberInlined + '.js');
            var inventedName = segments.join('.');
            this.addFileFromScriptElement(scriptElement, inventedName, scriptElement.textContent);
          } else {
            var boundAdder = this.addFileFromScriptElement.bind(this, scriptElement, scriptElement.src);
            this._asyncLoad(scriptElement.src, boundAdder);
          }
        }
      },

      get reporter() {
        if (!this.reporter_) {
          this.reporter_ =  new traceur.util.ErrorReporter();
        }
        return this.reporter_;
      },

      get compiler() {
        if (!this.compiler_) {
          this.compiler_ = new traceur.codegeneration.Compiler(this.reporter, this);
        }
        return this.compiler_;
      },

      compile: function() {
        var trees = this.compiler.compile_();
        if (this.reporter.hadError()) {
          console.warn('Traceur compilation errors', this.reporter);
          return;
        }
        return trees;
      },

      putFile: function(file) {
          var scriptElement = document.createElement('script');
          scriptElement.setAttribute('data-traceur-src-url', file.name);
          scriptElement.textContent = file.generatedSource;

          var parent = file.scriptElement.parentNode;
          parent.insertBefore(scriptElement, file.scriptElement || null);
      },

      putFiles: function(files) {
        files.forEach(this.putFile.bind(this));
      },

      runInWebPage: function(trees) {
        var files = this.generateSourceFromTrees(trees);
        this.putFiles(files);
      },

      generateSourceFromTrees: function(trees) {
        return trees.keys().map(function(file) {
          var tree = trees.get(file);
          var TreeWriter = traceur.outputgeneration.TreeWriter;
          file.generatedSource = TreeWriter.write(tree, {showLineNumbers: false});
          return file;
        }.bind(this));
      },

      runScriptsIfNonePending_: function() {
        if (this.numPending) {
          return;
        }
        var trees = this.compile();
        this.runInWebPage(trees);
      },

      runWebPage: function() {
        document.addEventListener('DOMContentLoaded', function() {
          var scripts = document.querySelectorAll('script[type="text/traceur"]');

          if (scripts.length <= 0) {
            return; // nothing to do
          }

          /* TODO: add traceur runtime library here
          scriptsToRun.push(
            { scriptElement: null,
              parentNode: scripts[0].parentNode,
              name: 'Runtime Library',
              contents: runtime });
          */

          this.addFilesFromScriptElements(scripts);
          this.runScriptsIfNonePending_();
        }.bind(this), false);
      }
    
  });
   
   return WebPageProject;
})();
