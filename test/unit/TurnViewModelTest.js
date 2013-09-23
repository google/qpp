// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

	var loadListViewModel = QuerypointPanel.LoadListViewModel.initialize();
	loadListViewModel.onBeginLoad(1);

	var turnOneData = QuerypointPanel.TestData.turnOneData;
	var turnTwoData = QuerypointPanel.TestData.turnTwoData;

	var loadModel = loadListViewModel.lastLoad();
	loadModel.onTurnStarted(turnOneData);
	loadModel.onTurnEnded(1);
	loadModel.onTurnStarted(turnTwoData);
	loadModel.onTurnEnded(2);
	
	loadListViewModel.onEndLoad(1);

	var turn11 = loadListViewModel.getTurnByLoad(1, 1);
	console.assert(turn11.turnNumber === turnOneData.turnNumber);

	var fakeProject = {
	  find: function() {},
	  createFileURL: function(url) {
	    return url;
	  },
	};
	var fakeTraceQueries = [];

	var turnViewModel = QuerypointPanel.TurnViewModel.initialize(loadListViewModel, fakeProject, fakeTraceQueries);

	turnViewModel.showTurn(1);
	console.assert(turnViewModel.turn().turnNumber === turnOneData.turnNumber);
	turnViewModel.showTurn(2);
	console.assert(turnViewModel.turn().turnNumber === turnTwoData.turnNumber);
}());
