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
  this.editorImpl.on('focus', this._onFocus.bind(this));
  this.editorImpl.on('blur', this._onBlur.bind(this));
  
  this._container = containerElement;
  this._onMouseOver = this._onMouseOver.bind(this);
  
  this._addUniqueClassName();
}

EditorByCodeMirror.prototype = {
  //-- Editor API
  
  show: function() {
    this.editorImpl.getWrapperElement().classList.remove('hide');
    this._watchMouse();
  },
  hide: function() {
    this.editorImpl.getWrapperElement().classList.add('hide');
    this._unwatchMouse();
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
    var posDidChange = 
      (!this._previousPosition) || 
      (this._previousPosition.line !== pos.line) || 
      (this._previousPosition.ch !== pos.ch);
    
    if (posDidChange) {
      this._previousPosition = pos;

      var token = this.editorImpl.getTokenAt(pos);
      token.line = pos.line;
      
      var tokenDidChange = 
        !(this.previousToken) ||
        (this.previousToken.line !== token.line) || 
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

  createTokenBox: function(tokenEvent) {
    var pos = {line: tokenEvent.start.line,ch: tokenEvent.start.column};
    var startCharBox = this.editorImpl.charCoords(pos);
    pos.ch = tokenEvent.end.column - 1;
    var endCharBox = this.editorImpl.charCoords(pos);
    var box = startCharBox;
    box.right = endCharBox.right;
    var originBox = this.editorImpl.charCoords({line: 0,ch: 0});
    var boxElement = document.createElement('div');
    boxElement.classList.add('box');
    boxElement.style.left = (box.left - originBox.left) + 'px';
    boxElement.style.top = (box.top - originBox.top) + 'px';
    boxElement.style.width = (box.right - box.left) + 'px';
    boxElement.style.height = (box.bottom - box.top) + 'px';
    return boxElement;
  },

  drawTokenBox: function(tokenEvent) {
    this._removeTokenBox();
    this._boxElement = this.createTokenBox(tokenEvent);

    var cm = this.editorImpl.getWrapperElement();
    var lines = cm.querySelector('.CodeMirror-lines');
    lines.appendChild(this._boxElement);
  },

  _removeTokenBox: function() {
    if (this._boxElement) {
      this._boxElement.parentElement.removeChild(this._boxElement);
      delete this._boxElement;
    }
  },

  _onFocus: function() {
    console.log("Editor focus");
    this._unwatchMouse();
    this._removeTokenBox();
  },

  _onBlur: function() {
    console.log("Editor blur");
    this._watchMouse();
  },

  _watchMouse: function() {
    // mouseover won't work because the text does not fire
    this._container.addEventListener('mousemove', this._onMouseOver);
    this.dispatch('onExploreTraceMode', {active: true});
  },
  _unwatchMouse: function () {
    this._container.removeEventListener('mousemove', this._onMouseOver);    
    this.dispatch('onExploreTraceMode', {active: false});
  }
}

Querypoint.addEventFunctions(EditorByCodeMirror.prototype);

