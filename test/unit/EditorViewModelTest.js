(function() {

  'use strict';

	var startTime = new Date().getTime();
	var a = new Async({PatientSelector: PatientSelector, PatientEvents: PatientEvents});

	var tests = {};



	function toArray(nodeList) {
		var ary = [];
		for (var i = 0; i < nodeList.length; i++)
			ary.push(nodeList[i]);
		return ary;
	}

	function mapNodeList(nodeList, fnc) {
		return toArray(nodeList).map(fnc);
	}

	function mapSelector(selector, fnc) {
		return mapNodeList(document.querySelectorAll(selector), fnc);
	}

	function editorViewModelTests(a, tests) {

		var element = document.querySelector('.fileEditor');
		var editorViewModel = new QuerypointPanel.EditorViewModel();

		// No element: the editor in the view is undefined
		console.assert(!editorViewModel.editor());

		editorViewModel.editorBy(element);

		// No content: the editor in the view is undefined
		console.assert(!editorViewModel.editor());

		var testURL = 'hello.js';

		editorViewModel.editorContents(
			{content: '// This is a test \nvar hello = "hello world";\nvar splits = hello.split(); ', url: testURL}
		);

		// Now the editor should be defined.
		console.assert(editorViewModel.editor());

		// Check its name
		console.assert(editorViewModel.name() === testURL);

		console.assert(editorViewModel.status() === 'unchanged');

		tests.highlight = false;
		a.PatientSelector.whenSelectorAll('.qp-highlight', '', function(elts) {
		  var highlights = mapSelector('.CodeMirror-code .qp-highlight', function(elt) {return elt.textContent;}).join('');
		  if ('"hello world"' === highlights)
		    tests.highlight = true;
		});
		tests.clearHighlight = false;
		a.PatientEvents.mouseToSelector('mouseout', 'body', '', function() {
		    if (document.querySelectorAll('.CodeMirror-code .qp-highlight').length === 0)
		      tests.clearHighlight = true;
		  });
		editorViewModel.mark({
			name: testURL,
			start: 31,
			end: 44
		});

		tests.decorate = false;
		a.PatientSelector.whenSelectorAll('.qp-decorate', '', function(elts) {
		  var decorations = mapSelector('.CodeMirror-code .qp-decorate', function(elt) {return elt.textContent;}).join('');
		  if ('hellosplits' === decorations)
		       tests.decorate = true;

		  tests.clearDecorations = false;
		  editorViewModel.clearDecorations();
		  if (document.querySelectorAll('.CodeMirror-code .qp-decorate').length === 0)
		    tests.clearDecorations = true;
		});
		editorViewModel.appendDecoration({
			name: testURL,
			start: 23,
			end: 28
		});
		editorViewModel.appendDecoration({
			name: testURL,
			start: 50,
			end: 56
		});
	}

	function loadListViewModelTests(a, tests) {
	  var loadListViewModel = QuerypointPanel.LoadListViewModel.initialize();
		loadListViewModel.onBeginLoad(1);
		console.assert(loadListViewModel.loadStartedNumber() === 1);
		console.assert(loadListViewModel.loadEndedNumber() === 0);

		loadListViewModel.onEndLoad(1);

		console.assert(loadListViewModel.loadStartedNumber() === 1);
		console.assert(loadListViewModel.loadEndedNumber() === 1);

		console.assert(loadListViewModel.showLoad() === loadListViewModel.lastLoad());
	  console.assert(loadListViewModel.currentLoadIsSelected());
	}

	editorViewModelTests(a, tests);
	loadListViewModelTests(a, tests);

	a.beginAsynchronousOperations(function() {
	  var failing = [];
	  Object.keys(tests).reduce(function(failing, test) {
	    if (!tests[test])
	      failing.push(test);
	    return failing;
	  }, failing);
	  if (!failing.length) {
	  	var endTime = new Date().getTime();
	    console.log("PASS " + (endTime - startTime) + 'ms');
	  } else {
	    Object.keys(tests).forEach(function(testName) {
	      console.log(testName + ': ' + (tests[testName] ? 'pass' : 'fail'));
	    });
	  }
	}, 500, function(result){
		if (result)
		  console.log('editorViewModelTests ' + result);
	});

}());

