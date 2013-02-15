  function request(method, url, callback, errback) {
    if (!callback || !errback) {
      throw new Error("Both callback and errback functions are required");
    }
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.addEventListener('load', function(e) {
      if (xhr.status == 200 || xhr.status == 0) {
        callback(xhr.responseText);
      } else {
        errback(xhr.status);
      }
    }.bind(this), false);
    var onFailure = function() {
      errback.apply(null, arguments);
    }.bind(this);
    xhr.addEventListener('error', onFailure, false);
    xhr.addEventListener('abort', onFailure, false);
    xhr.send();
  };

  function onSuccess(content) {
    var src = content + '\n//@ sourceURL=demo.js\n';
    eval.call(window, src);
    window.onLoad();
  }
  function onError(err) {
    console.error("Failed "+err, err);
  }

  request('GET', 'demo.js', onSuccess, onError);
