'use strict';

var express = require('express');

function servePathAtPort(path, port) {
  var app = express();
  app.use(express.static(path));   // before directory to allow index.html to work
  app.use(express.directory(path));
  app.listen(port);
  console.log('serving ' + path + ' at ' + port);
}


//servePathAtPort(__dirname + '/..', 8686);

servePathAtPort('../../devtoolsExtended/extension/WebInspectorKit', 9696);

servePathAtPort('../../webdev-examples', 7676);

servePathAtPort('../../traceur-compiler', 7677);


var jsDAV = require("jsDAV/lib/jsdav"),
    jsDAV_Locks_Backend_FS = require("jsDAV/lib/DAV/plugins/locks/fs");

// setting debugMode to TRUE outputs a LOT of information to console
//jsDAV.debugMode = true;

jsDAV.createServer({
    node: __dirname + "/..",
    locksBackend: new jsDAV_Locks_Backend_FS(__dirname + "/jsDAV_locks")
}, 8686);