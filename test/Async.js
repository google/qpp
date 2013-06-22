// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function() {

  var debug = false;

  function AsyncMachine() {
    this.ops_ = [];
  }

  AsyncMachine.prototype = {
    // opt_callback, function called when machine stack is empty
    // opt_timeout, how long in ms to wait for async operatios,
    // opt_resultProcessor, async op callback returns are passed to this function.
    start: function(opt_callback,opt_timeout, opt_resultProcessor) {
      this.stackEmptyCallback_ = opt_callback;
      this.timeout_ = opt_timeout || 250;
      this.resultProcessor_ = opt_resultProcessor;
      this.runOp();
    },

    pushOp: function(fnc, args) {
      this.ops_.push({fnc: fnc, args: args});
    },
    
    wrapCallback: function(fnc) {
      var machine = this;
      return function() {
        var args = Array.prototype.slice.apply(arguments);
        var result = fnc.apply(this, args);
        machine.runOp(result);
      }
    },

    runOp: function(prevResult) {
      if (this.resultProcessor_) {
          prevResult = this.resultProcessor_(prevResult);
        }
      if (prevResult) {
        console.log("AsyncMachine result " + prevResult);
      }
      this.checkBlock();
    },

    unblock: function() { // called by evaluation from testRunner
      return !delete this.blocked; 
    },

    checkBlock: function() {
      if (this.blocked) {
        if (debug) console.log("AsyncMachine.blocked " + this.blocked);
        setTimeout(this.checkBlock.bind(this), this.timeout_);
      } else {
        this.nextOp();
      }
    },

    nextOp: function() {
      var op = this.ops_.shift();
      if (op) {
        this.resultProcessor_ = op.resultProcessor;
        var fncName = op.fnc.toString().match(/function.*?{/);
        if (debug) console.log("Running test operation " + fncName, op);
        op.fnc.apply(this, op.args);
      } else {
        if (this.stackEmptyCallback_)
          this.stackEmptyCallback_();
      }
    }

  };

  /** @param {object} sync: properties are objects; public methods of those
   **   objects are 'asynchronized': eg a.Foo.bar(1, true, baz); will
   **   stage a call to Foo.bar(1, true, wrap(baz)); triggering the next
   **   async call when baz function returns.
   */
  function Async(sync) {
    var machine = new AsyncMachine();
    
    var thisAsync = this;
    
    function isPublicMethod(fnc, fncName) {
      if (typeof fnc === 'function') {
        if (fncName[0] !== '_' && fncName[fncName.length - 1] !== '_')
          return true;
      }
    }

    function makeAsync(fnc) {
      // A member of Async.fromObjName that delays the call to fnc
      return function() {
        var args = Array.prototype.slice.apply(arguments).map(function(arg) {
          if (typeof arg === 'function')
            return machine.wrapCallback(arg);
          else
            return arg;
        });
        machine.pushOp(fnc, args);
      }
    }

    var thisAsync = this;
    function addMethods(fromObjName, fromObj) {
      var thisAsyncObj = thisAsync[fromObjName] = {};
      Object.keys(fromObj).forEach(function(fromProp) {
        if (isPublicMethod(fromObj[fromProp], fromProp))
          thisAsyncObj[fromProp] = makeAsync(fromObj[fromProp].bind(fromObj)); 
      });
    }
    Object.keys(sync).forEach(function(objName) {
      addMethods(objName, sync[objName]);
    });

    this.beginAsynchronousOperations = function(then, timeout, process) {
      machine.start(then, timeout, process);
    }
  }

  window.Async = Async;

}());