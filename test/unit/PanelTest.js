// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Relative to project root
var testScripts = [
	'../mutation-summary/mutation_summary.js',
	'../test/PatientSelector.js',
	'../test/Async.js',
	'../test/unit/EditorViewModelTest.js',
	'../test/unit/LoadListViewModelTest.js',
];

function loadTestScripts() {
	var remaining = testScripts.slice(0);

	function loadOne() {
		var src = remaining.shift();
		if (src) {
			var scriptElt = document.createElement('script');
			scriptElt.src = src;
			scriptElt.onload = loadOne;
			console.log('append ' + src);
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
