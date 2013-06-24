// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

	var loadListViewModel = QuerypointPanel.LoadListViewModel.initialize();
	loadListViewModel.onBeginLoad(1);

	var turnOneData = QuerypointPanel.TestData.turnOneData;
	var turn1 = new QuerypointPanel.Turn(turnOneData);
	var turnTwoData = QuerypointPanel.TestData.turnTwoData;
	var turn2 = new QuerypointPanel.Turn(turnTwoData);

	var loadModel = new QuerypointPanel.LoadModel(1);
	loadModel.onTurnStarted(turnOneData);
	loadModel.onTurnEnded(1);
	loadModel.onTurnStarted(turnTwoData);
	loadListViewModel.onEndLoad(1);

	var fakeProject = {};
	var fakeTraceQueries = [];

	var turnViewModel = QuerypointPanel.TurnViewModel.initialize(loadListViewModel, fakeProject, fakeTraceQueries);

	turnViewModel.showTurn(1);
	console.assert(turnViewModel.turn() === turn1);
	turnViewModel.showTurn(2);
	console.assert(turnViewModel.turn() === turn2);
}());
