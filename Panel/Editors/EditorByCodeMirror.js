 // Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Implement Editor functions using CodeMirror

function EditorByCodeMirror(containerElement, name, initialContent) {
  this.name = name;
  this.editorImpl = CodeMirror(containerElement, {
    value: initialContent,
    mode: "javascript",
    lineNumbers: true,
    theme: "monokai", // TODO UI to change themes
  });
  
  this.editorImpl.on('change', this._onChange.bind(this));
  this.editorImpl.on('viewportChange', this._onViewportChange.bind(this));
  this.editorImpl.on('gutterClick', this._onGutterClick.bind(this));
  
  this._container = containerElement;
  this._onMouseOver = this._onMouseOver.bind(this);
  
  this._addUniqueClassName();
}

EditorByCodeMirror.prototype = {
  //-- Editor API
  
  show: function() {
    this.editorImpl.getWrapperElement().classList.remove('hide');
    // mouseover won't work because the text does not fire
    this._container.addEventListener('mousemove', this._onMouseOver);
  },
  hide: function() {
    this.editorImpl.getWrapperElement().classList.add('hide');
    this._container.removeEventListener('mousemove', this._onMouseOver);
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
  setLineNumberClass: function(lineNumber, className) {
    this.editorImpl.addLineClass(lineNumber, 'wrap', className);
  },
  removeLineNumberClass: function(lineNumber, className) {
    this.editorImpl.removeLineClass(lineNumber, 'wrap', className);
  },

  insertElement: function(line, column, element, scrollIntoView) {
    var widgetCharCoord = this.editorImpl.charCoords({line: line,ch: column}, "page");
    var lineCharCoord = this.editorImpl.charCoords({line: line,ch: 0}, "page");
    element.style.left = (widgetCharCoord.left - lineCharCoord.left) + 'px';
    var lineHandle = this.editorImpl.getLineHandle(line);
    this.editorImpl.addLineWidget(lineHandle, element);
  },
  setLineClass: function(line, textClassName, backgroundClassName) {
    this.editorImpl.addLineClass(line, 'wrap');
  },
  getViewport: function() {
    var viewport = this.editorImpl.getViewport(); // (from:<integer> to:<integer>}
    return {name: this.name,start: viewport.from,end: viewport.to};
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
    this.dispatch('onChange', {name: this.name,changes: changes});
  },
  _onViewportChange: function(editor, from, to) {
    console.log("EditorByCodeMirror onViewportChange" + this.name + ':' + from + ',' + to);
    this.dispatch('onViewportChange', {name: this.name,start: from,end: to});
  },
  _onGutterClick: function(editor, line) {
    this.dispatch('onClickLineNumber', {name: this.name,line: line});
  },
  _onMouseOver: function(event) { // emit tokenEvent iff things change
    var pos = this.editorImpl.coordsChar({top: event.clientY,left: event.clientX});
    var posDidChange = !this._pos || 
    (this._pos.line !== pos.line) || 
    (this._pos.ch !== this._pos.ch);
    
    if (posDidChange) {
      var token = this.editorImpl.getTokenAt(pos);
      
      var tokenDidChange = !this.previousToken || 
      (this.previousToken.string !== token.string) || 
      (this.previousToken.start !== token.start) || 
      (this.previousToken.end !== token.end);
      
      if (tokenDidChange) {
        this.previousToken = token;
        this.dispatch('onTokenOver', {
          start: {line: pos.line,column: token.start},
          end: {line: pos.line,column: token.end},
          token: token.string
        });
      }
    }
  },
  drawTokenBox: function(tokenEvent) {
    var pos = {line: tokenEvent.start.line,ch: tokenEvent.start.column};
    var startCharBox = this.editorImpl.charCoords(pos);
    pos.ch = tokenEvent.end.column - 1;
    var endCharBox = this.editorImpl.charCoords(pos);
    var box = startCharBox;
    box.right = endCharBox.right;
    var originBox = this.editorImpl.charCoords({line: 0,ch: 0});
    var cm = this.editorImpl.getWrapperElement();
    var lines = cm.querySelector('.CodeMirror-lines');
    if (this._boxElement)
      this._boxElement.parentElement.removeChild(this._boxElement);
    this._boxElement = document.createElement('div');
    this._boxElement.classList.add('box');
    this._boxElement.style.left = (box.left - originBox.left) + 'px';
    this._boxElement.style.top = (box.top - originBox.top) + 'px';
    this._boxElement.style.width = (box.right - box.left) + 'px';
    this._boxElement.style.height = (box.bottom - box.top) + 'px';
    lines.appendChild(this._boxElement);
  }

}

Querypoint.addEventFunctions(EditorByCodeMirror.prototype);

