// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// Feature testing API, generally async queries that wait for matching elements to appear 

window.PatientSelector = (function(){

    var DEBUG = true;
    
    function doc() {
        return document.location.pathname.split('/').pop();
    }

    // http://www.kirupa.com/html5/get_element_position_using_javascript.htm
    // modified
    function getPosition(element, toParent) {
        var xPosition = 0;
        var yPosition = 0;
  
        while(element && element !== toParent) {
            xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
            yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
            element = element.offsetParent;
        }
        return { x: xPosition, y: yPosition };
    }

    var PatientSelector = {
        
        _textSelectorAll: function(nodes, textToMatch) {
               return nodes.reduce(function findTextMatching(nodes, node) {
                    if (node.textContent.indexOf(textToMatch) !== -1)
                        nodes.push(node);
                    return nodes;
                }, []);
        },

        // If selector starts with pipe ('| '), select within previous match
        _querySelectorAll: function(selector, textToMatch) {
            var m = /^\| (.*)/.exec(selector);
            if (m) {
                selector = m[1];
                targets = this.hits;
            } else {
                targets = [document];
            }
           
            try {
                var nodes = this._selected = [];
                var nodeList;
                targets.forEach(function(target) {
                    nodeList = target.querySelectorAll(selector);
                    for (var i = 0; i < nodeList.length; i++) {
                        this._selected.push(nodeList[i]);
                    }    
                }.bind(this));
            } catch (exc) {
                console.error("....PatientSelector._querySelectorAll query failed for " + selector + ": " + exc, targets);
            }

            if (DEBUG) 
                console.log("....PatientSelector._querySelectorAll finds "+this._selected.length+" matches for "+selector);

            if (textToMatch) {
                nodes = this._textSelectorAll(nodes, textToMatch);
                if (DEBUG)
                    console.log("....PatientSelector._querySelectorAll finds "+nodes.length+" matches for "+selector+" with text "+textToMatch);
            } 
            return this.hits = nodes;
        },

        ancestor: function(selector, callback) {
            var hit = this.hits[0];
            var parent = hit.parentElement;
            while (parent) {
                var hit = parent.querySelector(selector);
                console.log("....PatientSelector.ancestor(" + selector + ")  %o " + (hit ? "hit" : "miss"), parent);
                if (hit) {
                    this.hits[0] = hit;
                    callback();
                    return;
                }
                parent = parent.parentElement;
            }
            this.hits = [];
            callback();
        },

        _textChanges: function(textToMatch, callback, mutationSummary) {
            if (this.poisoned) {  // hack because disconnect() does not seem to work.
                console.warn("....PatientSelector._textChanges poisoned " + textToMatch);
                return;
            }
            console.log("....PatientSelector._textChanges mutationSummary for " + textToMatch, mutationSummary[0]);
            var target = mutationSummary[0].target;
            this.patientSelector.hits = this.patientSelector._textSelectorAll([target], textToMatch);
            if (this.patientSelector.hits.length)
                callback();
        },

        _totalTextChangeObservers: 0,

        _createTextChangeObserver: function(textToMatch, element) {
            this._totalTextChangeObservers++;
            console.log('....PatientSelector._createTextChangeObserver _totalTextChangeObservers ' + this._totalTextChangeObservers, this);
            var pill = {
                poisoned: false,
                patientSelector: this
            };
            pill.handler = this._textChanges.bind(pill, textToMatch, this._disconnectOnFind.bind(this));
            var summary = new MutationSummary({
                callback: pill.handler,
                queries:[{characterData: true}],
                rootNode: element
            });
            summary._textToMatch = textToMatch;
            summary._changeProcessor = pill;
            return summary;
        },

        _whenSelectorHits: function(textToMatch, callback, mutationSummary) {
            console.log("....PatientSelector._whenSelectorHits mutationSummary ", mutationSummary[0]);
            var added = mutationSummary[0].added;
            this.hits = this._textSelectorAll(added, textToMatch);
            if (this.hits.length) {
                callback(this.hits);
                return;
            }
            added.forEach(function(element) {
                this._textChangeObservers = this._textChangeObservers || [];
                this._textChangeObservers.push(this._createTextChangeObserver(textToMatch, element));
            }.bind(this));
        },

        _setMutationObservers: function(selector, textToMatch, callback) {
            this._disconnectOnFind = function() {
                if (this._addedSelectionObserver)
                    this._addedSelectionObserver.disconnect();
                if (this._textChangeObservers) {
                    this._textChangeObservers.forEach(function(observer){
                        observer.disconnect();
                        observer._changeProcessor.poisoned = true;
                        console.log('....PatientSelector._setMutationObservers disconnect  ' + observer._textToMatch, observer);
                    }.bind(this));
                    this._totalTextChangeObservers -= this._textChangeObservers.length;
                    console.log('....PatientSelector._setMutationObservers _totalTextChangeObservers ' + this._totalTextChangeObservers, this);
                }
                delete this._addedSelectionObserver;
                delete this._textChangeObservers;
                if (DEBUG)
                    console.log("....PatientSelector.whenSelectorAll found "+PatientSelector.hits.length +" for " + selector + " with text "+textToMatch);
                callback();
            }

            if (this._selected.length) {
                if (this._textChangeObservers) {
                    console.error('....PatientSelector._setMutationObservers unexpected _textChangeObservers ', this._textChangeObservers);
                }
                this._textChangeObservers = this._selected.map(this._createTextChangeObserver.bind(this, textToMatch));
                console.log('....PatientSelector._setMutationObservers initial _totalTextChangeObservers ' + this._totalTextChangeObservers, this);
            } 
            this._addedSelectionObserver = new MutationSummary({
                callback: this._whenSelectorHits.bind(this, textToMatch, this._disconnectOnFind.bind(this)),
                queries: [
                    {element: selector}
                ]
            });
            if (DEBUG) {
                console.log("....PatientSelector.whenSelectorAll waiting for \'" + selector + "\' with text " + textToMatch + ' in ' + doc());
                /*
                this._textChangeObservers = this._textChangeObservers || [];
                this._textChangeObservers.push(new MutationSummary({
                    queries:[{all:true}],
                    callback: function(summary) {
                      console.log('....PatientSelector.whenSelectorAll querySelectorAll ' + selector, document.querySelectorAll(selector))
                      console.log('....PatientSelector.whenSelectorAll debug all from ' + selector + '/' + textToMatch, summary);    
                    }
                }));
                */                
            }
        },

        whenSelectorAll: function(selector, textToMatch, callback) {
            this.hits = this._querySelectorAll(selector, textToMatch);
            if (this.hits.length) {
                callback();
            } else {
                try {
                    this._setMutationObservers(selector, textToMatch, callback);
                } catch (exc) {
                    console.error("....PatientSelector._setMutationObservers FAIL "+exc, exc);
                }
            } 
        },

        _click: function(elt, callback) {
            var event = document.createEvent("MouseEvent");
            event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            elt.dispatchEvent(event);
            if (callback)
                callback();
        },

        clickSelector: function(selector, textToMatch, callback) {
            console.log("....PatientSelector.clickSelector(" + selector + ', ' + textToMatch + ')');
            this.whenSelectorAll(selector, textToMatch, function() {
                this._click(PatientSelector.hits[0], callback);
                if (DEBUG) 
                    console.log("....PatientSelector.clickSelector hit ", PatientSelector.hits[0])
            }.bind(this));
        },

        selectTokenInSource: function(editorTokens, callback) {
            console.log("....PatientSelector.selectTokenInSource(" + editorTokens.length + " editorTokens) ", editorTokens);
            var visibleSourceElement = this._querySelectorAll('.CodeMirror-lines');
            var visibleSourceLines = this._querySelectorAll('| pre');
            var mark = 0;
            function next() {
                var token = editorTokens.shift();
                var selector = 'span.cm-' + token.type;
                var text = token.text;
                    
                if (editorTokens.length) {
                    while (mark < visibleSourceLines.length) {
                        PatientSelector.hits = [visibleSourceLines[mark]];
                        var hits = PatientSelector._querySelectorAll('| '+selector, text);
                        if (hits.length) {
                            console.log('....PatientSelector.selectTokenInSource ' + selector + '&' + text + ' match ' + visibleSourceLines[mark].textContent); 
                            mark++;  
                            break;                            
                        } else {
                            mark++;
                        }
                    }
                    if (mark === visibleSourceLines.length - 1) {
                        console.error("...PatientSelector.selectTokenInSource no source line matchs " + selector + ' & ' + text, visibleSourceLines);
                        callback('err');
                    } else {
                        next();
                    }

                } else {
                    console.log('....PatientSelector.selectTokenInSource seeking pre ancestor of ', PatientSelector.hits);
                    PatientSelector.ancestor('pre', function() {
                        if (!PatientSelector.hits.length) {
                            console.error('....PatientSelector.selectTokenInSource ancestor selection failed', PatientSelector);
                            callback();
                        }
                        // select within the previous hit
                        var tokenElt = PatientSelector._querySelectorAll('| ' + selector, text)[0];

                        var xy = getPosition(tokenElt);
                        xy.x = xy.x + Math.round(tokenElt.offsetWidth/2);
                        xy.y = xy.y + Math.round(tokenElt.offsetHeight/2);
                        var mousemove = document.createEvent("MouseEvent");
                        mousemove.initMouseEvent('mousemove', true, true, window, 0, 
                            0, 0, xy.x, xy.y, 
                            false, false, false, false, 0, null);
                        tokenElt.dispatchEvent(mousemove);
                        console.log('....PatientSelector.selectTokenInSource mousemove(' + xy.x + ',' + xy.y + ') sent to %o', tokenElt);
                        PatientSelector.hits = [tokenElt];
                        callback(); 
                    });
                }
            }
            next();
        },

        clickTokenInSource: function(editorTokens, callback) {
            PatientSelector.selectTokenInSource(editorTokens, function() {
                PatientSelector._click(PatientSelector.hits[0], callback);
            });
        },

        evaluateInPage: function(expr, callback) {
            function checkException(result, isException) {
                if (isException) {
                    console.error("....PatientSelector.evaluateInPage(" + expr + ") exception", result);
                } else {
                    callback(result);
                }
            }
            chrome.devtools.inspectedWindow.eval(expr, checkException);
        },

        evaluate: function(expr, callback) {
            try {
                callback(eval(expr));  
            } catch (exc) {
                console.error("....PatientSelector.evaluate(" + expr + ") exception " + exc, exc);
            }
        },

        reloadPage: function(callback) {
            chrome.devtools.inspectedWindow.reload();
            callback();
        },

        extractText: function(selector, callback) {
            var text = PatientSelector._querySelectorAll(selector).map(function(node){
                return node.textContent;
            }).join('|');
            console.log("testResult "+text);
            callback(text);
        },

        extractFromSelection: function(selector, property, callback) {
            var text = PatientSelector._querySelectorAll(selector).map(function(node){
                return node[property];
            }).join('|');
            console.log("testResult "+text);
            callback(text);
        },

        extractAttr: function(selector, attr, callback) {
            var text = PatientSelector._querySelectorAll(selector).map(function(node){
                return node.getAttribute(attr);
            }).join('|');
            console.log("testResult "+text);
            callback(text);
        },

        getBoundingClientRect: function(selector, textToMatch, callback) {
            var rects = PatientSelector._querySelectorAll(selector, textToMatch).map(function(node){
                var rect = node.getBoundingClientRect();
                var obj = {};
                Object.keys(rect).forEach(function(prop){
                    obj[prop] = rect[prop];
                });
                return obj;
            });
            callback(rects);
        },

        getStyle: function(selector, textToMatch, callback) {
            var styles = PatientSelector._querySelectorAll(selector, textToMatch).map(function(node){
                var style = node.style;
                var obj = {};
                Object.keys(style).forEach(function(prop){
                    obj[prop] = rect[prop];
                });
                return obj;
            });
            callback(styles);
        },

        //------------------------------------------------------------------------------------
        // For addressing command to extension iframes

        proxies: {},
        postId: 0,
        proxyHandlers: [],

        createProxy: function(port, iframeURL) { // onConnect from extension iframe

            function onMessage(message) {
                console.log("....PatientSelector.proxyTo.onMessage ", message);
                var payload = message;
                var postId = payload.shift();
                var method = payload.shift();
                var status = payload.shift();
                var handler = this.proxyHandlers[postId];
                if (handler) {
                    if (status === 'Error')
                        handler.onError(payload);
                    else 
                        handler.onResponse(payload);
                    delete this.proxyHandlers[postId];                    
                } else {
                    console.error("....PatientSelector.createProxy.onMessage no handler for " + postId + ' in ' + doc(), message);
                }
            }

            var proxy = this.proxies[iframeURL] = new ChannelPlate.Base(port, onMessage.bind(this));
            console.log("....PatientSelector.createProxy for " + iframeURL);
            // The frame just contacted us, maybe we have a message waiting to send it.
            this._postToProxy(proxy);
        },

        _postToProxy: function(proxy) {
            var handler = this.proxyHandlers[this.postId];
            if (handler && !handler.sent) {
                handler.sent = proxy.postMessage(handler.args);
                console.log("....PatientSelector.proxyTo.postMessage sent: " + handler.sent + " to " + handler.url, handler.args);                
            }
        },

        proxyTo: function(url, proxied, callback, errback) {
            console.log("....PatientSelector.proxyTo " + url, proxied);
            var postId = ++this.postId;
            this.proxyHandlers[postId] = {url: url, onResponse: callback, onError: errback, args: [postId].concat(proxied)};

            var proxy;
            Object.keys(this.proxies).some(function(iframeURL) {
                if (iframeURL.indexOf(url) !== -1) {
                    return proxy = this.proxies[iframeURL];
                }
            }.bind(this));

            if (proxy) {
                this._postToProxy(proxy);
            } else {
                console.log("....PatientSelector.proxyTo waiting for " + url);
            }
        }
    };
    
    return PatientSelector;
}());
