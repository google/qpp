// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com


// The test case iframe is a child of the extension iframe
var DevtoolsWindowTestAPI = (new RemoteMethodCall.Requestor(PatientSelector, ChannelPlate.ChildIframe)).serverProxy();

function reProxy(api, url) {
  var reAPI = {};
  Object.keys(api).forEach(function(method) {
    reAPI[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(method);
      var callback = args.pop();
      DevtoolsWindowTestAPI.proxyTo(url, args, callback)
    }
  })
  return reAPI;
}
var ExtensionTestAPI = reProxy(PatientSelector, "QuerypointDevtoolsPage.html");
//-----------------------------------------------------------------------------

