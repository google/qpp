var express = require('express');

function servePathAtPort(path, port) {
  var app = express();
  app.use(express.static(path));   // before directory to allow index.html to work
  app.use(express.directory(path));
  app.listen(port);
  console.log('serving ' + path + ' at ' + port);
}


servePathAtPort(__dirname + '/..', 8686);

servePathAtPort('../../devtoolsExtended/extension/WebInspectorKit', 9696);

servePathAtPort('../../webdev-examples', 7676);

servePathAtPort('../../traceur-compiler', 7677);
