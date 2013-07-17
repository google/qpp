// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// On URLs that end in #unittest, load the testScripts to run unit tests.

(function() {
	// Relative to project root
	var testScripts = [
		'../mutation-summary/mutation_summary.js',
		'../test/PatientSelector.js',
		'../test/Async.js',
		'../test/unit/PanelTestData.js',
		'../test/unit/EditorViewModelTest.js',
		'../test/unit/TurnAndLoadModelTest.js',
		'../test/unit/LoadListViewModelTest.js',
		'../test/unit/TurnViewModelTest.js',
		'../test/unit/TraceViewModelTest.js',
	];

	function loadTestScripts() {
		var remaining = testScripts.slice(0);

		function loadOne() {
			var src = remaining.shift();
			if (src) {
				var scriptElt = document.createElement('script');
				scriptElt.src = src;
				scriptElt.onload = loadOne;
				document.head.appendChild(scriptElt);
			}
		};

		loadOne();
	}

	function checkForUnitTest() {
		if (window.location.hash === '#unittest') {
			document.querySelector('.panelInitialization').style.display = 'none';
			loadTestScripts();
		}
	}

	window.addEventListener('hashchange', checkForUnitTest);
	window.addEventListener('load', checkForUnitTest);
})();
