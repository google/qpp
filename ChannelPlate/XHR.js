// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

(function(){

    var xhrFromBackground = (new RemoteMethodCall.Requestor(XHRInBackground, ChannelPlate.DevtoolsTalker)).serverProxy();

    var XHR = {
      asyncLoadInBackground: function(url, fncOfContent) {
        xhrFromBackground.GET(
          [url], 
          function(content) {
            fncOfContent(content);
          },
          function(err) {
            console.error("asyncLoad failed to GET " + url +': ' + err);
          }
        );
      },

      asyncLoadText: function(url, callback, errback) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
          if (xhr.status == 200 || xhr.status == 0) {
            callback(xhr.responseText);
          } else {
            errback();
          }
          xhr = null;
        };
        xhr.onerror = function() {
          errback();
        };
        xhr.open('GET', url, true);
        xhr.send();
        return xhr;
      }
      
    };

    window.XHR = XHR;

  }());