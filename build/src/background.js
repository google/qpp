// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

window.debuggerOrDebuggee; 

(function(){

  var crx2appKey = 'crx2app.options';
  var atopwiURL = 'chrome-extension://ggimboaoffjaeoblofehalflljohnfbl/atopwi/atopwi.html';

  localStorage.removeItem(crx2appKey);
  var options = new ExtensionOptions(crx2appKey, {
    allowedSites: [
      {
        name: 'DevtoolsExtended',
        site: atopwiURL
      }
    ]
  });

  //********** workaround for http://code.google.com/p/chromium/issues/detail?id=108519
  var crx2appBase = window.crx2appBase || "crx2app/extension"; 
  var fakeBlankURL = crx2appBase + '/workaroundBug108519.html';
  //**********
  
  var websocketJSONURL = "http://localhost:9222/json";

  function notify(whyFailed) {
    webkitNotifications.createNotification("", "No Dogfood", whyFailed);
  }

  function onJSON(matcher, data) {
    var entries = JSON.parse(data);
    var found = entries.some(matcher);
    if (!found)
      notify("atopwi not among json entries from " + websocketJSONURL);
  }

  function getWebSocketURLFromJSONEntry(entry) {
    var wsParam = entry.webSocketDebuggerUrl.replace('://','=');
    return atopwiURL + '?' + wsParam;
  }
    
  function openRemoteDevtools(url, fncOfWindow) {
    function onWindowCreated(win) {
      console.log("Opened Remote DevtoolsExtended on "+url);
      fncOfWindow(win);
    }
    var createData = {url: url, type: 'popup' };
    chrome.windows.create(createData, onWindowCreated);
  }

  function getJSONAsync(onJSON) {
    var websocketJSONURL = "http://localhost:9222/json";
    XHRInBackground.GET(websocketJSONURL, onJSON, notify.bind(null, "xhr failed"));
  }
  
  //--------------------------------------------------------------------------------------
  // Sync
  var sync = {remoteDebug : {tabs:{}, focused: undefined}};
  var debuggers = {}; // keys remote-tabId, values popup Windows

  function updateSync() {
    var sending = new Date().getTime();
    chrome.storage.sync.set(sync, function(){
      var sent = new Date().getTime();
      console.log(debuggerOrDebuggee + " sent remoteDebug in " + (sent - sending) + "ms", sync);
    });
  }

  function openDebugger(tab) {
      function findDevtoolsExtendedInJSON(entry) {
        console.log(debuggerOrDebuggee + " openDebugger trying entry "+entry.url + '===' + tab.url);
        if (entry.url === tab.url) {
          openRemoteDevtools(getWebSocketURLFromJSONEntry(entry), function onPopup(win){
            debuggers[tab.id] = win;
          });
          return true;
        }
      }

      var matcher = findDevtoolsExtendedInJSON;
      var onJSONMatch = onJSON.bind(null, matcher);
      getJSONAsync(onJSONMatch);
  }

// Server side
chrome.storage.onChanged.addListener(function(changes, namespace) {
    console.log(debuggerOrDebuggee + " storage changes", changes);
    if ('remoteDebug' in changes) {
      var storageChange = changes.remoteDebug;
      console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                'remoteDebug',
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
      if (debuggerOrDebuggee === 'debugger') {
        chrome.storage.sync.get('remoteDebug', function onStorage(items) {
           console.log("storage.sync.get remoteDebug: %o, debuggers: %o", items.remoteDebug, debuggers);
           cleanupDebuggers(items.remoteDebug);  //maybe a tab was deleted
           syncDebuggers(items.remoteDebug); // maybe a tab was added
        });
      }
     }
  });

  // debugger side
  function cleanupDebuggers(remoteDebug) {
    Object.keys(debuggers).forEach(function(tabId){
      if (tabId in remoteDebug.tabs) {
        return;
      } else {
        var win = debuggers[tabId];
        chrome.windows.remove(win.id, function() {
          delete debuggers[tabId];  
        });
      }
    });
  }

  // debugger side
  function syncDebuggers(remoteDebug) {
    Object.keys(remoteDebug.tabs).forEach(function(tabId){
      if (tabId in debuggers) {
        if (remoteDebug.focused === tabId) {
          chrome.windows.update(debuggers[tabId].id, {focused: true}, function(){
            console.log("syncDebuggers tried to focus the debugger matching"+tabId);
          });
        }
        return;
      } else {
        openDebugger(remoteDebug.tabs[tabId]);
      }
    });
  }

  // debuggee side
  chrome.tabs.onRemoved.addListener(function(tabId) {
    if (tabId in sync.remoteDebug.tabs) {
      delete sync.remoteDebug.tabs[tabId];
      updateSync();
    }
  });

  //--------------------------------------------------------------------------------------
  // context menu

  function onContextMenuClick(info, tab) {
    debuggerOrDebuggee = 'debuggee';
    sync.remoteDebug.tabs[tab.id] = tab;
    sync.remoteDebug.focused = tab.id; 
    updateSync();
  }

  buildContextMenuItem("Remote DevtoolsExtended", onContextMenuClick);


  // -------------------------------------------------
  // PageAction

  function onTabUpdate(tabId, changeInfo, tab) {
    // For debugger side we need an activator UI
    if (tab.url.indexOf('http://localhost:922') > -1) { // any http port in 922*
      chrome.pageAction.show(tabId);
    }
  };

  chrome.tabs.onUpdated.addListener(onTabUpdate);

  function onPageAction(tab) {
    debuggerOrDebuggee = 'debugger';
    chrome.storage.sync.get('remoteDebug', function onStorage(items) {
      console.log("storage.sync.get remoteDebug", items);
      var tabId = items.remoteDebug.focused;
      var tab = items.remoteDebug.tabs[tabId];
      if (!tab) {
        console.error("Focused tab %s not amoung remote tabs %o", tabId, items.remoteDebug.tabs);
        return;
      }
      openDebugger(tab);
    });
  }

  chrome.pageAction.onClicked.addListener(onPageAction);  

}())




function saveByPUT(url, content, callback) {
  
}

function BackgroundPage() {
  this._plugin = document.getElementById("save-plugin");
  this._initMessages();
  this._mapping = new FileMapping();
  chrome.extension.onRequest.addListener(this._onRequest.bind(this));
  chrome.extension.onMessageExternal.addListener(this._onRequest.bind(this));
  window.addEventListener("storage", this._onStorageUpdated.bind(this), false);
}

BackgroundPage.prototype._initMessages = function(plugin) {
  this._messages = [];
  var plugin = this._plugin;
  if (!plugin)
    return;
  this._messages[plugin.ERR_NOT_FOUND] =
      "File or path not found. NOTE: we only write to existing files.";
  this._messages[plugin.ERR_NO_ACCESS] =
      "Access denied.";
  this._messages[plugin.ERR_EXECUTABLE] =
      "Refusing to write to an executable file.";
  this._messages[plugin.ERR_BACKREFERENCE] =
      "Path contains backreferences.";
  this._messages[plugin.ERR_RELATIVE_PATH] =
      "Path is relative. Please specify absolute path.";
  this._messages[plugin.ERR_MISSING_ALLOW_DEVTOOLS] =
      "Missing .allow-devtools-save file in path from file to root.";
  this._messages[plugin.ERR_WRITE_FAILED] =
      "Failed while writing to file. Perhaps, disk full or network error?";
  this._messages[plugin.ERR_INTERNAL] =
      "Internal error, please check logs and report to developers.";
}

BackgroundPage.prototype._onRequest = function(request, sender, sendResponse) {
  if (this._mapping.isEmpty()) {
    this._issueConfigurationNotice();
    return;
  }
  var url = request.url.replace(/[?#].*/, "");
  url = decodeURIComponent(url);
  var target = this._mapping.map(url);
  if (!target) {
    sendResponse({ saved: false, error: "Check devtools-save options page, no mapping for "+url });
    return;
  }
  this._save(target, request.content, sendResponse);
}

BackgroundPage.prototype._save = function(target, content, sendResponse) {
  function callback(success, error) {
    if (error)
      this._notifyError(target, error);
    else
      this._notifySuccess(target);
    sendResponse({
      saved: success,
      error: error,
      actualTarget: target
    });
  }
  if (/^https?:/.test(target))
    this._saveByDAV(target, content, callback.bind(this));
  else
    this._saveLocally(target, content, callback.bind(this));
}

BackgroundPage.prototype._saveLocally = function(target, content, callback) {
  if (!this._plugin.save) {
    callback(false, "No devtools-save plugin installed -- perhaps, " + 
        "unsupported platform?");
    return;
  }
  var saved = false;
  var error;
  try {
    var rc = this._plugin.save(target, content);
    if (!rc)
      saved = true;
    else
      error = this._messages[rc] || ("Uknown error while saving file: " + rc);
  } catch (e) {
    error = e.toString();
  }
  callback(saved, error);
}

BackgroundPage.prototype.testLocalPath = function(path) {
  if (!this._plugin || !this._plugin.testPath) {
    return "Unable to save locally, missing plugin object " +
        "(perhaps, an unsupported platform).";
  }
  var rc = this._plugin.testPath(path);
  if (!rc)
    return;
  return this._messages[rc] || ("Uknown error accessing path: " + rc);
}

BackgroundPage.prototype._saveByDAV = function(url, content, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('PUT', url);
  xhr.addEventListener('load', function(e) {
    if (xhr.status == 200 || xhr.status == 0) {
      callback("saved");
    }
  });
  var onFailure = function (msg) {
    callback(false, msg);
  };
  xhr.addEventListener('error', onFailure, false);
  xhr.addEventListener('abort', onFailure, false);
  xhr.send(content);
}

BackgroundPage.prototype._onStorageUpdated = function(event) {
  if (event.storageArea === window.localStorage && event.key === "files-map")
    this._mapping.load();
}

BackgroundPage.prototype._notifyError = function(filename, error) {
  var notification = webkitNotifications.createNotification("img/error.png",
      "Error saving file!", filename + ": " + error);
  notification.show();
}

BackgroundPage.prototype._notifySuccess = function(filename) {
  var notification = webkitNotifications.createNotification(
      "img/saved-ok.png", "Saved ok", "Successfuly saved " + filename);
  notification.addEventListener("display",
      BackgroundPage._onDisplayNotification, false);
  notification.show();
}

BackgroundPage.prototype._issueConfigurationNotice = function(filename) {
  var key = "config-notification-given";
  if (localStorage.getItem(key))
    return;
  var notification = webkitNotifications.createHTMLNotification(
      "config_notification.html");
  notification.show();
  localStorage.setItem(key, "yes");
}

BackgroundPage._onDisplayNotification = function(event) {
  window.setTimeout(function() { event.target.cancel(); }, 2000);
}

window.addEventListener('load', function() {
  // When the dom is ready, the plugin will be loaded.
  window.backgroundPage = new BackgroundPage();
});

var DevtoolsExtendedOptions = new ExtensionOptions(optionsKey, defaultOptions, extractExtensionInfos);
