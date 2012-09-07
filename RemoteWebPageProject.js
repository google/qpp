// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// A traceur WebPageProject that delegates XHR to chrome extension background and
// extracts scripts via chrome.inspectedWindow.eval

function RemoteWebPageProject(remoteURL) {
  WebPageProject.call(this, remoteURL);
  RemoteWebPageProject.currentProject = this;
  console.log("project created for "+remoteURL);
}

RemoteWebPageProject.onBackgroundMessage = function(message) {
  if (this.currentProject) {
    this.currentProject.onBackgroundMessage(message);
  } else {
    console.log("background message but no current project ", this);  
  }
}.bind(RemoteWebPageProject);

RemoteWebPageProject.postId = 1;
RemoteWebPageProject.postCallbacks = {};
RemoteWebPageProject.backgroundPort = new ChannelPlate.DevtoolsTalker(RemoteWebPageProject.onBackgroundMessage);

RemoteWebPageProject.prototype = Object.create(WebPageProject.prototype);

RemoteWebPageProject.prototype.run = function() {
  this.addFilesFromScriptElements(this.remoteScripts);
  this.runScriptsIfNonePending_();
}

RemoteWebPageProject.prototype.asyncLoad_ = function(url, fncOfContent) {
  this.numPending++;
  // mihaip@chromium.org on https://groups.google.com/a/chromium.org/d/msg/chromium-extensions/-/U33r217_Px8J
  // The whitelisting for cross-origin XHRs only happens when running in an extension process. 
  // Your iframe is running inside the devtools process, so it doesn't get that privilege. 
  //You'll need to use the messaging API to ask the extension's background page to fetch the URL 
  // and send the response back to the iframe.
  var postId = RemoteWebPageProject.postId++;
  RemoteWebPageProject.postCallbacks[postId] = fncOfContent;
  RemoteWebPageProject.backgroundPort.postMessage([postId, "xhr", url]);
}

RemoteWebPageProject.prototype.onBackgroundMessage = function(message) {
  var payloadArray = message;
  var postId = payloadArray.shift();
  var method = payloadArray.shift();
  if (method === "xhr") {
    var args = payloadArray;
    var callback = RemoteWebPageProject.postCallbacks[postId];
    if (callback) {
      callback.apply(this, args);
      delete RemoteWebPageProject.postCallbacks[postId];
    } else {
      console.error("callback missing for message", message);
    }
  } else if (method="xhr_failed") {
    console.warn("Failed to load " + url);
  }
  this.numPending--;
  this.runScriptsIfNonePending_();
}

RemoteWebPageProject.prototype.putFiles = function(files) {
  var scripts = files.map(function(file){
    var source = file.generatedSource + "\n//@ sourceURL=" + file.name;
    return {content: source};
  });
  this.putPageScripts(scripts, function(result) {
    console.log(" and the result is... ", result);
  });
};

//----------------------------------------------------------------------------------------------------------
// chrome.devtools.inspectedWindow.eval() based script extractor

RemoteWebPageProject.prototype.evalStringify = function(fnc, args) {
  return '(' +fnc.toString() + '(' + JSON.stringify(args) + ')'+ ');'
}

RemoteWebPageProject.prototype.getPageScripts = function(callback) {
  // We can't access the page directly and 
  // script elements with type="application/traceur" are not loaded as devtools resources.

  function getScripts() { // runs in the web page
    var scriptElements = document.querySelectorAll('script');
    var scripts = [];
    for(var i = 0; i < scriptElements.length; i++) {
      var elt = scriptElements[i];
      console.log("scripts["+i+"/"+scriptElements.length+"] "+elt.src);
      scripts.push({
        src: elt.src,
        textContent: elt.textContent
      });
    }
    return scripts;
  }

  function onScripts(remoteScripts) { // runs here
    this.remoteScripts = remoteScripts;
    callback();
  }

  chrome.devtools.inspectedWindow.eval(this.evalStringify(getScripts, []), onScripts.bind(this));
};

RemoteWebPageProject.prototype.putPageScripts = function(scripts, callback) {
  function putScripts(scripts) { // runs in web page
    scripts.forEach(function(script) {
      var content = script.content;
      eval(content);
    });
  }
  return chrome.devtools.inspectedWindow.eval(this.evalStringify(putScripts, scripts), callback);
}
