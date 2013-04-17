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
  
  Querypoint.Base64 = Base64;

  function toBase64DataURI(src) {
    //data:[<MIME-type>][;charset=<encoding>][;base64],<data>
    return 'data:application/javascript;base64,' + Querypoint.Base64.encode(src);
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
      "Querypoint/Base64.js"
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
      
      iframe.setAttribute('src', toHTMLDataURL(toBase64DataURI(src)));
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
        
        var transcoderInvoke = QPPreprocessor._functionSource(descriptors);

        var wrapper = 'function transcoder(src, name){\n';
        // Hack for WebInspector evaluations
        wrapper += '  if (src.slice(0, 4) === "with") return src;'
        wrapper += '  var input = {name: name, contents: src}; \n';
        wrapper += '  var window = {};\n';
        wrapper += '  var console = {};\n';
        wrapper += '  var traceur = this.traceur;\n';
        wrapper += '  if (!traceur) {  // once only\n';
        wrapper += '    traceur = this.traceur = {};\n';
        wrapper += src + '\n';
        wrapper += '    this.traceur = traceur;\n';
        wrapper += '    this.Querypoint.Base64 = Base64;\n';
        wrapper += '  }\n';  
        wrapper += transcoderInvoke;
        wrapper += '}\n';
        
        onSource(wrapper);
      });
    },

    _functionSource: function(descriptors) {
      // Expects environment to supply 'input.name' and 'input.contents'
      // Beware: all lines must have semicolons
      // Maybe we can use this someday: /* || escape('data:text/html,<script>' + encodeURIComponent(input.contents) + '</script>') + '.js'; */
      function transformAndGenerate(descriptorsJSON) {
          if (typeof input !== 'object')
            throw new Error('transformAndGenerate requires JS object named |input|');
          var reporter = new Querypoint.QPErrorReporter();
          var fileCompiler = new Querypoint.QPFileCompiler(reporter);
          input.name = input.name === 'undefined' ? undefined : input.name; 
          var name = input.name || 'eval_' + Math.random().toString().split('.')[1] + '.js';

          var file = new traceur.syntax.SourceFile(name, input.contents);
          var tree = fileCompiler.parse(file);
          var descriptors = JSON.parse(descriptorsJSON);
          var generatedSource = fileCompiler.generateSourceFromTree(tree, name, descriptors);
          var generatedFileName = input.name ? (input.name  + ".js") : toBase64DataURI(generatedSource);
          var sourceURL =  '//@ sourceURL=' + generatedFileName + '\n';
          if (input.name) {
            var turnIndicator = "window.__qp._theTurn = window.__qp.startTurn('ScriptBody', [{name: \"" + file.name + "\"}]);\n"
            var endTurnIndicator = "window.__qp.endTurn(window.__qp._theTurn);\n";
            return turnIndicator + generatedSource + endTurnIndicator + sourceURL;
          } else {
            return generatedSource + sourceURL;
          }
      }
      var json = JSON.stringify(descriptors);
      return toBase64DataURI + '\n' + transformAndGenerate + '\n return transformAndGenerate(\'' + json + '\');\n';
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
