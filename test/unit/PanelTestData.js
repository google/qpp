// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  QuerypointPanel.TestData = {
	turnOneData: {
		turnNumber: 1,
		functionName: '[[Navigation]]',
	    filename: window.location.href,
	    offset: 0,
	},
	turnTwoData: {
		turnNumber: 2,
		eventType: 'load',
		targetSelector: 'window',
		functionName: 'aFunction',
	    filename: window.location.href,
	    offset: 0,
	    registrationTurnNumber: 0
	}
};

}());
