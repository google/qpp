// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
  'use strict';

  var debug = DebugLogger.register('QPPreprocessor', function(flag){
    return debug = (typeof flag === 'boolean') ? flag : debug;
  });

  // http://stackoverflow.com/questions/9238890/convert-html-to-datatext-html-link-using-javascript
  function toDataURL(src) {
    return 'data:text/html,<script>' + encodeURIComponent(src) + '</script>';
  }

  function toHTMLDataURL(scriptSrcHref) {
    return 'data:text/html,<script src=\"' + scriptSrcHref + '\"></script>';
  }

  var QPPreprocessor = {
    scripts: [
      "Querypoint/PreprocessorConsole.js",
      "traceur/bin/traceur.js",
      "DebugLogger.js",
      "Querypoint/GlobalSymbols.js",
      "Querypoint/ScopeAttacher.js",
      "Querypoint/AllInFileTransformer.js",
      "Querypoint/InsertingTransformer.js",
      "Querypoint/InsertVariableForExpressionTransformer.js",
      "Querypoint/LinearizeTransformer.js",
      "Querypoint/QPFunctionPreambleTransformer.js",
      "Querypoint/SetTracedElementTransformer.js",
      "Querypoint/Query.js",
      "Querypoint/ValueChangeQueryTransformer.js",
      "Querypoint/QPErrorReporter.js",
      "Querypoint/QPFileCompiler.js",
      "Querypoint/QPTreeWriter.js",
      "Querypoint/Base64.js",
      "Querypoint/transformAndGenerate.js"
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

      iframe.setAttribute('src', toHTMLDataURL(Querypoint.toBase64DataURI(src)));
      document.body.appendChild(iframe);
    },

    source: function(descriptors, onSource) {
      if (Querypoint.QPPreprocessor.useAsyncPreprocessor)
        onSource(this.asyncTranscoder + '');
      else
        this._combineSources(descriptors, this.scripts, onSource);
    },

    _combineSources: function(descriptors, scripts, onSource) {
      this._scriptSource(scripts, function(concatentatedScripts) {

        var json = JSON.stringify(descriptors);

        var wrapper = 'function transcoder(src, name){\n';
        // Hack for WebInspector evaluations
        wrapper += '  if (src.slice(0, 4) === "with") return src;'
        wrapper += '  var input = {name: name, contents: src}; \n';
        wrapper += '  var global = (\'global\', eval)(\'this\') || window;\n';
        wrapper += '  var console = {};\n';
        wrapper += '  var traceur = this.traceur;\n';
        wrapper += '  if (!traceur) {  // once only\n';
        wrapper += '    traceur = this.traceur = {};\n';
        wrapper += concatentatedScripts + '\n';
        wrapper += '    this.traceur = traceur;\n';
        wrapper += '  }\n';
        wrapper += 'return Querypoint.transformAndGenerate(input, \'' + json + '\');\n';
        wrapper += '}\n';

        onSource(wrapper);
      });
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
