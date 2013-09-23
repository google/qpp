// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {
	var loadListViewModel = QuerypointPanel.LoadListViewModel.initialize();
	loadListViewModel.onBeginLoad(1);
	console.assert(loadListViewModel.loadStartedNumber() === 1);
	console.assert(loadListViewModel.loadEndedNumber() === 0);

	loadListViewModel.onEndLoad(1);

	console.assert(loadListViewModel.loadStartedNumber() === 1);
	console.assert(loadListViewModel.loadEndedNumber() === 1);

	console.assert(loadListViewModel.showLoad() === loadListViewModel.lastLoad());
	console.assert(loadListViewModel.currentLoadIsSelected());

	
}());

