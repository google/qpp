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
        this.logTestCases.apply(this, arguments);
        
        QPController.initialize();
        QPController.setConsole(this.testConsole);
        eval(queries);
        
        var qpCompiler = new QPCompiler(reporter, QPController.model);

        var project = new traceur.semantics.symbols.Project(document.location.href);
        var file = new traceur.syntax.SourceFile(name, source);
        project.addFile(file);
        var trees = qpCompiler.compile(project);

        var results = this.testConsole._results;
        var resultElement = document.createElement('pre');
        resultElement.textContent = results.join("\n");        
        element.appendChild(resultElement);
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

  logTestCases: function(name, source, queries, expected) {  
    console.log(name + " Source" + source);
    console.log(name + " QP commands " + queries);
    console.log(name + " Expected output " + expected);
  }

};

function onLoad() {
    QPTestController.runTest();
}

window.addEventListener('load', onLoad);