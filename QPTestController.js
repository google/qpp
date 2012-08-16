// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPTestController = {

  testConsole: {
      _results : [],
      log: function() {
          this._results.push(Array.prototype.slice.apply(null, arguments));
      },
      
  },

  runTest: function() {
      var reporter = new QPErrorReporter();
      var cases = this.scanPageForTestCases(function(name, source, queries, expected, element){
        
        // Set up the tracequeries for this test

        QPController.initialize();
        QPController.setConsole(this.testConsole);
        eval(queries);  // The queries section operates on QPController to define the QPs
        
        // visit the parse tree before the first transformation and record the traceLocations

        var tracequeries = QPController.tracequeries();
        var qpCompiler = new QPCompiler(reporter, tracequeries);
        var project = new traceur.semantics.symbols.Project(document.location.href);
        var file = new traceur.syntax.SourceFile(name, source);
        project.addFile(file);
        var trees = qpCompiler.compile(project);

        // Insert tracepoint generation code at the traceLocations

        var qpTreeWriter = new QPTreeWriter(name+".js", tracequeries);
        var tracedSources = trees.values().map(qpTreeWriter.generateSource.bind(qpTreeWriter));

        // run the tracedSource, the queries are written into the testConsole
        
        var tracedSource = tracedSources[0].generatedSource;
        console.log("tracedSource: "+tracedSource);
        eval(tracedSource);

        var results = QPController.tracepoints();
        results.forEach(function(result) {
          delete result.tracequery;  // to simplify testing            
        });
        var resultElement = document.createElement('pre');
        resultElement.classList.add('actual');
        var actual = resultElement.textContent = JSON.stringify(results);        
        element.appendChild(resultElement);
        
        this.logTestCases(name, source, queries, expected, actual);
    }.bind(this));
  },

  toArray: function(nodeList) {
    var arr = [];
    for(var i = 0; i < nodeList.length; i++) {
        arr.push(nodeList[i]);
    }
    return arr;
  },

  scanPageForTestCases: function(fncOfTestCase) {
    this.toArray(document.querySelectorAll(".test-case")).forEach(function (testCaseElt) {
      function grabText(selector) {
          var elt = testCaseElt.querySelector(selector);
          if (elt)
            return elt.textContent;
      }
      fncOfTestCase(
        grabText('.name'),
        grabText('.source'),
        grabText('.queries'),
        grabText('.expected'),
        testCaseElt
      );
    });
  },

  logTestCases: function(name, source, queries, expected, actual) {  
    console.log(name + " Source" + source);
    console.log(name + " QP commands " + queries);
    console.log(name + " Expected output " + expected);
    console.log(name + " Actual output " + actual);
  }

};

function onLoad() {
    QPTestController.runTest();
}

window.addEventListener('load', onLoad);