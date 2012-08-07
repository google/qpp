var express = require('express');
var app = express();

function servePathAtPort(path, port) {
  app.use(express.static(path));   // before directory to allow index.html to work
  app.use(express.directory(path));
  app.listen(port);
  console.log('serving ' + path + ' at ' + port);
}


servePathAtPort(__dirname, 8686);

servePathAtPort('../sirius/extension/atopwi', 9696);

servePathAtPort('../webdev-examples', 7676);

servePathAtPort('/work/chromium/src/third_party/WebKit/', 7777);