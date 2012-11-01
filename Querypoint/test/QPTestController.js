// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPTestController = {

  testConsole: {
      _results : [],
      log: function() {
          this._results.push(Array.prototype.slice.apply(null, arguments));
      },
      
  },

   reporter: new QPErrorReporter(),

  runTest: function(name, source, queries, expected, element){
        
        // Set up the tracequeries for this test

        Querypoints.initialize();
        Querypoints.setConsole(this.testConsole);
        eval(queries);  // The queries section operates on Querypoints to define the QPs
        
        // Looks like this will be stock compilation, yay
        var qpCompiler = new QPCompiler(this.reporter);
        var project = new traceur.semantics.symbols.Project(document.location.href);
        var file = new traceur.syntax.SourceFile(name + '.js', source);
        project.addFile(file);
        var trees = qpCompiler.compile(project);

        // visit the parse tree after the linearization transformation and record the traceLocations

        var tracequeries = Querypoints.tracequeries();
        QPTracer.trace(trees, tracequeries);

        // Insert tracepoint generation code at the traceLocations

        var qpTreeWriter = new QPTreeWriter(name+".js", tracequeries);
        var tracedSources = trees.values().map(qpTreeWriter.generateSource.bind(qpTreeWriter));

        // run the tracedSource, the queries are written into the testConsole
        
        var tracedSource = tracedSources[0].generatedSource;
        console.log("tracedSource: "+tracedSource);
        eval(tracedSource);

        QPTestController.logTracepoints(name, source, queries, expected, element);
        console.log("Querypoints: ", Querypoints.querypoints());

    },
    
    logTracepoints: function(name, source, queries, expected, element) {
        var fullTracepoints = Querypoints.tracepoints();
        var results = fullTracepoints.map(function(tp) {
            var result = {};
            Object.keys(tp).forEach(function shallowCopy(key) {
                result[key] = tp[key];
            });
          delete result.tracequery;  // only return JSONable values
          return result;            
        });
        var resultElement = document.createElement('pre');
        resultElement.classList.add('actual');
        var actual = resultElement.textContent = JSON.stringify(results);        
        element.appendChild(resultElement);
        
        this.logTestCases(name, source, queries, expected, actual);
    },

    getAllTestCaseElements: function() {
      return this.toArray(document.querySelectorAll(".test-case"));
    },

  runAllTests: function() {
      var allTestCaseElements = this.getAllTestCaseElements();
      var cases = allTestCaseElements.forEach(
          this.getTestCase.bind(this,  this.runTest.bind(this))
       );
  },

  toArray: function(nodeList) {
    var arr = [];
    for(var i = 0; i < nodeList.length; i++) {
        arr.push(nodeList[i]);
    }
    return arr;
  },

  getTestCase: function(fncOfTestCase, testCaseElt) {
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
  },

  logTestCases: function(name, source, queries, expected, actual) {  
    console.log(name + " Source" + source);
    console.log(name + " QP commands " + queries);
    console.log(name + " Expected output " + expected);
    console.log(name + " Actual output " + actual);
  }

};

function onLoad() {
    QPTestController.runAllTests();
    document.addEventListener('click', function(event) {
      var testCaseElt = event.target;
      while(testCaseElt && !testCaseElt.classList.contains('test-case')) 
        testCaseElt = testCaseElt.parentElement;

      if (testCaseElt) {
        this.getTestCase(this.runTest.bind(this), testCaseElt);
      }
    }.bind(QPTestController));
}

window.addEventListener('load', onLoad);