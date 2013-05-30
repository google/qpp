// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function(){

  QuerypointPanel.OnPanelOpen = {
    
    onClick: function(event) {
      var target = event.target;
      var className = target.classList.item(0);
      if (className) {
        var objMethod = className.split('_');
        var obj = objMethod[0];
        var method = objMethod[1];
        if (obj && method) {
          this[obj][method].call(this, event);  
        }  
      }
    },

    initialize: function(panel) {
      this.panel = panel;          // TODO: should be this._panel
      var onPanelOpen = document.querySelector('div.onPanelOpen');
      onPanelOpen.addEventListener('click', this.onClick.bind(this));
    },
    
    close: function() {
      var onPanelOpen = document.querySelector('div.onPanelOpen');
      onPanelOpen.classList.remove('initialView');
    },

    open: function(runtimeInstalled) {
      var onPanelOpen = document.querySelector('div.onPanelOpen');
      onPanelOpen.classList.add('initialView');
      if (runtimeInstalled)
        onPanelOpen.classList.add('QPInstalled');
      else
        onPanelOpen.classList.remove('QPInstalled');
    },

    // Functions wired to eg hint_overview
    hint: {
      overview: function() {
        this.panel.toggleHelp();
      },
      documentation: function() {
        window.open("http://google.github.com/qpp/documentation.html");
      },
      feedback: function() {
        window.open("https://github.com/google/qpp/issues/new");
      }
    },
    initialOptions: {
      reloadWithQP: function () {
        this.panel.project.reload();
        this.close();
      },
      reloadWithoutQP: function() {
        this.panel.project.reloadWithoutRuntime();
        this.close();
      },
      noReload: function() {
        this.close();
      }
    }
  }

}());