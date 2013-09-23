// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  'use strict';

  var fakeProject = {
    find: function() {},
    createFileURL: function(url, s, e) {
      return url + '?startOffset=' + s + '&endOffset=' + e + '&';
    },
  };

  var fakeData = {
  	query: {
  		title: function() { return 'title';},
  		iconText: function() { return 'iconText';},
  	},
  	file: 'file.js',
  	startOffset: 10,
  	endOffset: 20
  };

  var traceViewModel = new QuerypointPanel.TraceViewModel(fakeData, fakeProject);

  console.assert(traceViewModel.iconText() === 'iconText');
  console.assert(traceViewModel.tooltip() === 'title found in file.js');
  console.assert(traceViewModel.url() === 'file.js?startOffset=10&endOffset=20&');
  /* TODO console.assert(traceViewModel.loadNumber() === 1);
  console.assert(traceViewModel.turnNumber() === 1);
  console.assert(traceViewModel.activationNumber() === 1);
  console.assert(traceViewModel.value() === 4);
  */

}());
