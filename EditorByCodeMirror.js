// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Implement Editor functions using CodeMirror

function EditorByCodeMirror(win,  containerElement, name, initialContent) {
  this.name = name;
  this.editorImpl = win.CodeMirror(containerElement, {
    value: initialContent,
    mode:  "javascript",
    lineNumbers: true,
    theme: "monokai"  // TODO UI to change themes
  });
  var validCSSClassNameRegExp = /-?[_a-zA-Z]+[_a-zA-Z0-9-]*/;
  var m = validCSSClassNameRegExp.exec(name);
  var uid = m[0];
  this.editorImpl.getWrapperElement().classList.add(uid);
}

EditorByCodeMirror.prototype = {
  show: function() {
    this.editorImpl.getWrapperElement().classList.remove('hide');
  },
  hide: function() {
    this.editorImpl.getWrapperElement().classList.add('hide');
  },
  getContent: function() {
    return this.editorImpl.getValue();
  },
  getName: function() {
    return this.name;
  }
}