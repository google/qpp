// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

var turnOneData = {
	turnNumber: 1,
	functionName: '[[Navigation]]',
    filename: window.location.href,
    offset: 0,
};

var turn0 = new QuerypointPanel.Turn(turnOneData);

var turnTwoData = {
	turnNumber: 2,
	eventType: 'load',
	targetSelector: 'window',
	functionName: 'aFunction',
    filename: window.location.href,
    offset: 0,
    registrationTurnNumber: 0
};

var turn1 = new QuerypointPanel.Turn(turnTwoData);

console.assert(turn1.summary() === 'aFunction|load|window');
console.assert(turn1.equivalentTo(turn1));

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

