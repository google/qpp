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
var ExtensionPanelTestAPI = reProxy(PatientSelector, "QuerypointPanel.html");        

//-----------------------------------------------------------------------------

console.log("begin " + window.location);

function reloadPage(then) {
  ExtensionTestAPI.reloadPage(then);
}

function openQuerypointPanel(then) {
  DevtoolsWindowTestAPI.clickSelector('div.toolbar-label', 'Querypoint', then);
}

function openSourceFile(fileName, then) {
  DevtoolsWindowTestAPI.clickSelector('div.item', fileName, then);
}

function selectTokenInSource(editorTokens, then) {
  ExtensionPanelTestAPI.selectTokenInSource(editorTokens, then);
}
function verifyTokenView(textToMatch, then) {
  ExtensionPanelTestAPI.whenSelectorAll('.currentExpression', textToMatch, then); 
}
function clickTokenInSource(editorTokens, then) {
  ExtensionPanelTestAPI.clickTokenInSource(editorTokens, then);
}
function clickQPOperation(name, then) {
  ExtensionPanelTestAPI.clickSelector('button.command', name, then);
}
function whenSelectorAll(selector, text, then) {
  ExtensionPanelTestAPI.whenSelectorAll(selector, text, then);
}
function clickSelector(selector, text, then) {
  ExtensionPanelTestAPI.clickSelector(selector, text, then);
}
function evaluateInPage(expr, then) {
  ExtensionTestAPI.evaluateInPage(expr, then);
}
function extractText(selector, then) {
  ExtensionPanelTestAPI.extractText(selector, then);
}

