// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

// Popup ItemSelector that calls actions when urls are selected.

(function() {

  "use strict";

  function URISelector(panel) {
    this.panel = panel;

    this._items = [];
    this._actions = [];  // co-indexed with _items
    this._itemsSent = 0;
  }
    
  URISelector.prototype = {
    appendItem: function(url, action) {
      var parsedURI = parseUri(url);
      if (parsedURI.file) {
        this._items.push( {
          key: parsedURI.file,  // The field searched
          title: parsedURI.file,  // the field shown. Why are these not the same?
          suffix: "",
          subtitle: parsedURI.directory,
          index: this._items.length // extra, JSONable property
        });
        this._actions.push(action);
      }  // else internal like 'event-bindings'         
    },

    // Call after every block of appendItem calls
    selectItem: function(thenCall) {
      if (!this.itemSelector) {
        this.itemSelector = this.panel.createItemSelector("SelectItem");
        this.itemSelector.onSelectedItem.addListener(this._onSelectedItem.bind(this, thenCall));
      }
      this.itemSelector.addItems(this._items.slice(this._itemsSent));
      this._itemsSent += this._items.length;
    },

    _onSelectedItem: function(thenCall, item) {
      if (item) {
        var action = this._actions[item.index];
        action(item);
      } else {
        if (thenCall)
          thenCall();
      }
      return false;
    }

  };

  QuerypointPanel.URISelector = URISelector;

}());
