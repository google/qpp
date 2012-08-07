var express = require('express');
var app = express();

function serve(path, port) {
  app.use(express.directory(your_path));
  app.use(express.static(your_path));	
}


