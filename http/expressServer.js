var express = require('express');

function servePathAtPort(path, port) {
  var app = express();
  app.use(express.static(path));   // before directory to allow index.html to work
  app.use(express.directory(path));
  app.listen(port);
  console.log('serving ' + path + ' at ' + port);
}

servePathAtPort(__dirname + '/..', 8686);
servePathAtPort(__dirname + "/../../devtoolsExtended/extension/", 9696);
servePathAtPort(__dirname + "/../../qpp-gh-pages", 8687);
servePathAtPort(__dirname + '/../../blink/', 8004);

servePathAtPort('../../webdev-examples', 7676);

servePathAtPort('../../traceur-compiler', 7677);

servePathAtPort('../../FakeMaker', 7679);
