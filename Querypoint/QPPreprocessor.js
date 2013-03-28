// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';

  var debug = DebugLogger.register('QPPreprocessor', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  var QPPreprocessor = {
    scripts: [
      "traceur/bin/traceur.js",
      "DebugLogger.js",
      "Querypoint/GlobalSymbols.js",
      "Querypoint/ScopeAttacher.js",
      "Querypoint/InsertingTransformer.js",
      "Querypoint/InsertVariableForExpressionTransformer.js",
      "Querypoint/LinearizeTransformer.js",
      "Querypoint/QPFunctionPreambleTransformer.js",
      "Querypoint/SetTracedElementTransformer.js",
      "Querypoint/Query.js",
      "Querypoint/ValueChangeQueryTransformer.js",
      "Querypoint/QPErrorReporter.js",
      "Querypoint/QPFileCompiler.js",
      "Querypoint/QPTreeWriter.js"
    ],
    functions: [],

    // We write a line that is parsed by Log.js calling back at this.addScript()
    asyncTranscoder: function transcoder(str, name ) {
      if (name && name.indexOf('.js.js') === -1)
        return  "console.log('qp| script " + name + "');";
      else
        return str; // evals, esp. our own evals!
    },

    transcoder: function(descriptors, onTranscoder) {
      this.source(descriptors, function (src){
        if (debug)
          QPPreprocessor.loadInIFrame(src);
        onTranscoder(src);
      });
    },

    loadInIFrame: function(src) {
      console.warn("QPPreprocessor.loadInIframe ");
      var iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      function transcoderTest() {
        console.log(transcoder('console.log("XXXXXXXXXXXXXXXXXXXXX success XXXXXXXXXXXXXXXXXXXXX");', 'foo'));
      }
      var transcoderTestSrc = '\n(' + transcoderTest + '());';
      src += transcoderTestSrc; 
      //http://stackoverflow.com/questions/9238890/convert-html-to-datatext-html-link-using-javascript
      iframe.setAttribute('src', 'data:text/html,<script>' + encodeURIComponent(src) + '</script>');
      document.body.appendChild(iframe);          
    },
    
    source: function(descriptors, onSource) {
      if (Querypoint.QPPreprocessor.useAsyncPreprocessor) 
        onSource(this.asyncTranscoder + '');
      else
        this._combineSources(descriptors, this.scripts, onSource);
    },

    _combineSources: function(descriptors, scripts, onSource) {
      this._scriptSource(scripts, function(src) {
        var wrapper = 'function transcoder(src, name){\n';
        wrapper += '  var input = {name: name, contents: src}; \n';
        wrapper += '  var traceur = this.traceur = {};\n';
        var transcoderInvoke = QPPreprocessor._functionSource(descriptors);
        //console.log('transcoderInvoke ', transcoderInvoke);
        onSource(wrapper + src + '\n' + transcoderInvoke + '}');
      });
    },

    _functionSource: function(descriptors) {
      // Expects environment to supply 'input.name' and 'input.contents'
      // Beware: all lines must have semicolons
      function transformAndGenerate(descriptorsJSON) {
        try {
          var descriptors = JSON.parse(descriptorsJSON);
          var reporter = new QPErrorReporter();
          var fileCompiler = new Querypoint.QPFileCompiler(reporter);
          var file = new traceur.syntax.SourceFile(input.name, input.contents);
          var tree = fileCompiler.parse(file);
          var generatedFileName = file.name + ".js";
          return  "console.log('qp| script TRACEUR" + name + "');";
          return fileCompiler.generateSourceFromTree(tree, generatedFileName, descriptors); 
        } catch(exc) {
          console.error("transformAndGenerate FAILS "+exc, exc.stack);
        }
      }
      var json = JSON.stringify(descriptors);
      return transformAndGenerate + '\n return transformAndGenerate(\'' + json + '\');\n';
    },

    _scriptSource: function(scripts, onSource) {
      var notLoaded = scripts.slice(0);
      var srcs = [];
      function loadOne(scriptURL) {
        XHR.asyncLoadText(scriptURL, 
          function(content){
            srcs.push(content);
            if (notLoaded.length) loadNext();
            else onSource(srcs.join('\n'));
          }, 
          function errback(error){
            console.error('QPPreprocessor._scriptSource FAILED on ' + scriptURL + ' with ' + error);
          }); 
      }
      function loadNext() {
        loadOne(notLoaded.shift());
      }
      loadNext();
    } 
    
  };

  Querypoint.QPPreprocessor = QPPreprocessor
}());
