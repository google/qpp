'use strict';

var express = require('express');

function servePathAtPort(path, port) {
  var app = express();
  app.use(express.static(path));   // before directory to allow index.html to work
  app.use(express.directory(path));
  app.listen(port);
  console.log('serving ' + path + ' at ' + port);
}


servePathAtPort('../../webdev-examples', 7676);

servePathAtPort('../../traceur-compiler', 7677);

servePathAtPort(__dirname + "/../../devtoolsExtended/extension/", 9696);
servePathAtPort(__dirname + "/../../devtoolsExtended/extension/WebInspectorKit", 8000);
servePathAtPort(__dirname + "/..", 8686);
servePathAtPort(__dirname + "/../../qpp-gh-pages", 8687);

//-----------------------------------------------------------------------

// This DAV server is a workaround for devatools-save failing on linux.

var jsDAV = require("jsDAV/lib/jsdav"),
    jsDAV_Locks_Backend_FS = require("jsDAV/lib/DAV/plugins/locks/fs");

var jsDAV_Server       = require("jsDAV/lib/DAV/server");
var jsDAV_Util       = require("jsDAV/lib/DAV/util");
var jsDAV_ServerPlugin = require("jsDAV/lib/DAV/plugin").jsDAV_ServerPlugin;

function jsDAV_CORS_Plugin(handler) {
  this.handler = handler;
  this.initialize();
}

jsDAV_CORS_Plugin.prototype = {
  __proto__: jsDAV_ServerPlugin.prototype,

  initialize: function(server) {
    this.handler.addEventListener('beforeMethod', this._intercept.bind(this));
  },

  _intercept: function(e, method) {
    this._addCORSHeaders(this.handler.httpRequest, this.handler.httpResponse);
    return e.next();
  },

  _addCORSHeaders: function(req, resp) {
    var headers = this._cors_headers(req);

    console.log('headers', headers);
    Object.keys(headers).forEach(function(headerName) {
      console.log('header '+headerName);
      resp.setHeader(headerName, headers[headerName]);  
    });
  },

  _accessControlAllowHeaders: function(req) {
    if (req.headers['access-control-request-headers']) {
      // Just tell the client what it wants to hear
      return req.headers['access-control-request-headers'];
    } else {
      // or tell it everything we know about plus any x- headers it sends
      return Object.keys(req.headers).reduce(function(headers, header){
        if (header.indexOf('x-') === 0) {
          headers += ", " + header;
        }
        return headers;
      }, this._defaultAccessControlAllowHeaders);
    }
  },

  _cors_headers: function(req) {
    console.log('here');
    var acah = this._accessControlAllowHeaders(req);
    var acao = req.headers.origin || '*';
    var cors_headers = {
      'access-control-allow-methods': 'HEAD, POST, GET, PUT, PATCH, DELETE, PROPFIND',
      'access-control-max-age': '86400',
      'access-control-allow-headers': acah,
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': acao,
    };
    console.log('cors_headers', cors_headers);
    
    return cors_headers;
  },

  _defaultAccessControlAllowHeaders: [
    "accept", 
    "accept-charset", 
    "accept-encoding", 
    "accept-language", 
    "authorization", 
    "content-length", 
    "content-type", 
    "host", 
    "origin", 
    "proxy-connection", 
    "referer", 
    "user-agent", 
    "x-requested-with"
  ],  
};

// setting debugMode to TRUE outputs a LOT of information to console
//jsDAV.debugMode = true;

/*
jsDAV.createServer({
    node: __dirname + "/..",
    locksBackend: new jsDAV_Locks_Backend_FS(__dirname + "/jsDAV_locks_8686"),
    plugins: jsDAV_Util.extend(jsDAV_Server.DEFAULT_PLUGINS, {
        "cors": jsDAV_CORS_Plugin
    })
}, 8686);

jsDAV.createServer({
    node: __dirname + "/../../devtoolsExtended/extension/WebInspectorKit",
    locksBackend: new jsDAV_Locks_Backend_FS(__dirname + "/jsDAV_locks_9696")
}, 9696).plugins.CORS_Plugin = jsDAV_CORS_Plugin;
*/