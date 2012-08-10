// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

var QPTestController = {
	runTest: function() {
		var cases = this.scanPageForTestCases(function(name, source, queries, expected){
			console.log(testCase.name + " Source" + source);
			console.log(testCase.name + " QP commands " + queries);
			console.log(testCase.name + " Expected output " + expected);			
		});
	},

	scanPageForTestCases: function(fncOfTestCase) {
		document.querySelectorAll(".test-case").forEach(function (testCaseElt) {
			function grabText(selector) {
				return testCaseElt.querySelector(selector).textContent;
			}
			fncOfTestCase(
				grabText('source'),
				grabText('queries'),
				grabText('expected')
			);
		});
	}
};