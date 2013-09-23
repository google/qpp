
 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function() {
  "use strict";

  Querypoint.Base64 = Base64;

  function toBase64DataURI(src) {
    //data:[<MIME-type>][;charset=<encoding>][;base64],<data>
    return 'data:application/javascript;base64,' + Querypoint.Base64.encode(src);
  }

  function transformAndGenerate(input, descriptorsJSON) {
      if (typeof input !== 'object')
        throw new Error('transformAndGenerate requires JS object named |input|');
      var reporter = new Querypoint.QPErrorReporter();
      var fileCompiler = new Querypoint.QPFileCompiler(reporter);
      if (input.name === 'undefined') {
        return input.contents;
      }
      input.name = input.name === 'undefined' ? undefined : input.name; 
      var name = input.name || 'eval_' + Math.random().toString().split('.')[1] + '.js';

      var file = new traceur.syntax.SourceFile(name, input.contents);
      var tree = fileCompiler.parse(file);
      var descriptors = JSON.parse(descriptorsJSON);
      var generatedSource = fileCompiler.generateSourceFromTree(tree, name, descriptors);
      var generatedFileName;
      if (input.name) {
        if (/\.js$/.test(input.name)) {
          generatedFileName = input.name  + ".js";
        } else {
          // .html.js does not work in devtools, so use .random.js
          var segments = input.name.split('.');
          segments.pop();
          generatedFileName = segments.join('.') + '_' + Math.random().toString().split('.')[1] + '.js'
        }
      } else {
          generatedFileName = toBase64DataURI(generatedSource); 
      }
       
      var sourceURL =  '//@ sourceURL=' + generatedFileName + '\n';
      if (input.name) {
        var startInfo = {name: file.name, generatedFileName: generatedFileName};
        var turnIndicator = "window.__qp._theTurn = window.__qp.startTurn('ScriptBody', ["+JSON.stringify(startInfo)+"]);\n"
        var endTurnIndicator = "window.__qp.endTurn(window.__qp._theTurn);\n";
        return turnIndicator + generatedSource + endTurnIndicator + sourceURL;
      } else {
        return generatedSource + sourceURL;
      }
  }

  Querypoint.transformAndGenerate = transformAndGenerate;
  Querypoint.toBase64DataURI = toBase64DataURI;

}());
