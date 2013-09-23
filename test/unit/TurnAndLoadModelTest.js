// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

	var turnOneData = QuerypointPanel.TestData.turnOneData;
	var turn1 = new QuerypointPanel.Turn(1, turnOneData);

	var turnTwoData = QuerypointPanel.TestData.turnTwoData;
	var turn2 = new QuerypointPanel.Turn(1, turnTwoData);

	console.assert(turn2.summary() === 'aFunction|load|window');
	console.assert(turn2.equivalentTo(turn2));

	var loadModel = new QuerypointPanel.LoadModel(1);
	loadModel.onTurnStarted(turnOneData);

	console.assert(loadModel.turnStarted() === 1);
	console.assert(loadModel.currentTurn() === loadModel.turns()[0]);

	loadModel.onTurnEnded(1);
	loadModel.onTurnStarted(turnTwoData);

	console.assert(loadModel.turnStarted() === 2);
	console.assert(loadModel.currentTurn() === loadModel.turns()[1]);
	console.assert(loadModel.currentTurn().summary() === 'aFunction|load|window');

	var chain = loadModel.causalChain(loadModel.currentTurn());
	console.assert(chain.length === 1);
	console.assert(chain[0] === loadModel.turns()[0]);

	// TODO verify that we can give adequate information about the registration
}());
