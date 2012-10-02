// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Backing data for Querypoint Panel, save/restore object

var Record = {
  sites: [], // ordered by time
};

var Site = {
  url: "",

  reloads: [],  // ordered by time
  selectedReload: {
    log: {
      messages: [],  // includes errors and warnings
      errors: [],
      warnings: [],
    }
  },

  editors: {
    onMessages: [
      {
        reload: 1,   // index into site.reloads
        message: 0,  // index into site.reloads.log.messages
        openURLs: []
      },
    ],
    unsaved: [], 
  } 
};