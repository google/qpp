// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPCompiler = (function() {
  'use strict';

  var TreeWriter = traceur.outputgeneration.TreeWriter;
  
  var QPCompiler = {
      /**
      @param scriptEntries array of {name: string, contents: string}
       */
    compileScripts: function(scriptEntries) {
      traceur.options.setFromObject({
          linearize: true,
          sourceMaps: true
      });
      var reporter = new QPErrorReporter();
      var project = new traceur.semantics.symbols.Project(document.location.href);

      var fileToEntry = new traceur.util.ObjectMap();

      for (var i = 0; i < scriptEntries.length; i++) {
        var entry = scriptEntries[i];
        var file = new traceur.syntax.SourceFile(entry.name, entry.contents);
        project.addFile(file);
        fileToEntry.put(file, entry);
      }

      var results = traceur.codegeneration.Compiler.compile(reporter, project);
      if (reporter.hadError()) {
        console.warn('Traceur compilation errors', reporter);
        return;
      }
          
      results.keys().forEach(function(file) {
        var tree = results.get(file);
        var transformer = QPController.transformer();
        tree = traceur.outputgeneration.QPTransformer.transformTree(tree, transformer);
        var result = TreeWriter.write(tree, {showLineNumbers: true});
        var entry = fileToEntry.get(file);
        eval(result + "//@ sourceURL="+entry.name+".js");  
      });
    }
  };

  function loadAllTraceurTags(callback) {
    // Code to handle automatically loading and running all scripts with type
    // text/traceur after the DOMContentLoaded event has fired.
    var scriptEntries = [];
    var numPending = 0;

    function compileScriptsIfNonePending() {
      if (numPending == 0) {
        callback(scriptEntries);
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      var scripts = document.querySelectorAll('script[type="text/traceur"]');

      if (scripts.length <= 0) {
        return; // nothing to do
      }

      /* TODO: add traceur runtime library here
      scriptEntries.push(
        { scriptElement: null,
          parentNode: scripts[0].parentNode,
          name: 'Runtime Library',
          contents: runtime });
      */

      for (var i = 0, length = scripts.length; i < length; i++) {
        var script = scripts[i];
        var entry = {
          scriptElement: script,
          parentNode: script.parentNode,
          name: script.src,
          contents: ''
        };

        scriptEntries.push(entry);
        
        if (!script.src) {  // inline script tag
          entry.contents = script.textContent;
          entry.name = document.location + ':' + i;
        } else {
          (function(boundEntry) {
            numPending++;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', script.src);
            xhr.addEventListener('load', function(e) {
              if (xhr.status == 200 || xhr.status == 0) {
                boundEntry.contents = xhr.responseText;
              }
              numPending--;
              compileScriptsIfNonePending();
            }, false);
            var onFailure = function() {
              numPending--;
              console.warn('Failed to load', script.src);
              compileScriptsIfNonePending();
            };
            xhr.addEventListener('error', onFailure, false);
            xhr.addEventListener('abort', onFailure, false);
            xhr.send();
          })(entry);
        }
      }
      compileScriptsIfNonePending();
    }, false);
  };
    
  loadAllTraceurTags(QPCompiler.compileScripts);
  
  return QPCompiler;
})();
