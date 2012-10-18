// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Implement Editor functions using CodeMirror

function EditorByCodeMirror(containerElement, name, initialContent) {
  this.name = name;
  this.editorImpl = CodeMirror(containerElement, {
    value: initialContent,
    mode:  "javascript",
    lineNumbers: true,
    theme: "monokai",  // TODO UI to change themes
    onChange: this._onChange.bind(this),
    onViewportChange: this._onViewportChange.bind(this),
  });
  this._addUniqueClassName();
}

EditorByCodeMirror.prototype = {
  //-- Editor API

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
  },
  resetContent: function(content) {
    this.editorImpl.setValue(content);
  },
  resize: function(width, height) {
    this.editorImpl.setSize(width, height);
  },


  //-------------------------
  _addUniqueClassName: function() {
    var validCSSClassNameRegExp = /-?[_a-zA-Z]+[_a-zA-Z0-9-]*/;
    var m = validCSSClassNameRegExp.exec(this.name);
    var uid = "noValidClassNameFromURL";
    if (m) {
      uid = m[0];
    }
    this.editorImpl.getWrapperElement().classList.add(uid);
  },

  // These handlers should redispatch in editorImpl-independent data.
  _onChange: function(editor, changes) {
    this.dispatch('onChange', {name: this.name, changes: changes});
  },
  _onViewportChange: function(editor, start, end) {
    this.dispatch('onViewportChange', {name: this.name, start: start, end: end});
  }
}

Querypoint.addEventFunctions(EditorByCodeMirror.prototype);

