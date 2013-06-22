// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// Feature testing API, generally async queries that wait for matching elements to appear 

(function(global){

    var debug = DebugLogger.register('PatientSelector', function(flag){
        return debug = (typeof flag === 'boolean') ? flag : debug;
    })

    
    function doc() {
        return document.location.pathname.split('/').pop();
    }

    function esClass(obj) {
        return (typeof obj !== 'undefined') && Object.prototype.toString.call(obj).match(/(\w+)\]/)[1];
    }

    function checkEsClass(obj, esClassName) {
        return esClass(obj) === esClassName;
    }


    var PatientSelector = {

        /**
            @param {string} selector: simplified CSS selector suitable for mutation-summary
            @param {string} textToMatch: must match unless blank
            @param {function([Element]} callback: when hit, provides array of Element
            @param {function} errback: when failure, provides exception
        */
        whenSelectorAll: function(selector, textToMatch, callback, errback) {
            errback = errback || function(exc) { console.error(exc, exc.stack); }
            if (!checkEsClass(selector, 'String')) {
                errback(this.usage()); 
                return;
            }
            if (!checkEsClass(textToMatch, 'String')) {
                errback(this.usage()); 
                return;
            }
            if (!checkEsClass(callback, 'Function')) {
                errback(this.usage()); 
                return;
            }
            if (!checkEsClass(errback, 'Function')) {
                errback(this.usage()); 
                return;
            }
                
            // Is the selection already in the document?
            PatientSelector.hits = PatientSelector._querySelectorAll(selector, textToMatch);
            if (PatientSelector.hits.length) {
                callback(PatientSelector.hits);
            } else {
                try {
                    PatientSelector._setMutationObservers(selector, textToMatch, callback);
                } catch (exc) {
                    if (errback)
                        errback(exc);
                    else
                        console.error("....PatientSelector._setMutationObservers FAIL "+exc, exc);
                }
            } 
        },

        usage: function() {
            return 'USAGE: whenSelectorAll(".cssSelector", "textToMatch", function(hits){}, function(exc){});';
        },
        //-------------------------------------------------------

        _querySelectorAll: function(selector, opt_textToMatch) {
            // If selector starts with pipe ('| '), select within previous match
            var m = /^\| (.*)/.exec(selector);
            if (m) {
                selector = m[1];
                targets = PatientSelector.hits;
            } else {
                targets = [document];
            }
           
            try {
                var nodes = PatientSelector._selected = [];
                var nodeList;
                targets.forEach(function(target) {
                    nodeList = target.querySelectorAll(selector);
                    for (var i = 0; i < nodeList.length; i++) {
                        PatientSelector._selected.push(nodeList[i]);
                    }    
                }.bind(PatientSelector));
            } catch (exc) {
                console.error("....PatientSelector._querySelectorAll query failed for " + selector + ": " + exc, targets);
            }

            if (debug) 
                console.log("....PatientSelector._querySelectorAll finds "+PatientSelector._selected.length+" matches for "+selector);

            if (opt_textToMatch) {
                nodes = PatientSelector._textSelectorAll(nodes, opt_textToMatch);
                if (debug)
                    console.log("....PatientSelector._querySelectorAll finds "+nodes.length+" matches for "+selector+" with text "+opt_textToMatch);
            } 
            return PatientSelector.hits = nodes;
        },
        
        _setMutationObservers: function(selector, textToMatch, callback) {
            PatientSelector._disconnectOnFind = function() {
                if (PatientSelector._addedSelectionObserver)
                    PatientSelector._addedSelectionObserver.disconnect();
                if (PatientSelector._textChangeObservers) {
                    PatientSelector._textChangeObservers.forEach(function(observer){
                        observer.disconnect();
                        if (debug) console.log('....PatientSelector._setMutationObservers disconnect  ' + observer._textToMatch, observer);
                    }.bind(PatientSelector));
                    PatientSelector._totalTextChangeObservers -= PatientSelector._textChangeObservers.length;
                    if (debug) console.log('....PatientSelector._setMutationObservers _totalTextChangeObservers ' + PatientSelector._totalTextChangeObservers, PatientSelector);
                }
                delete PatientSelector._addedSelectionObserver;
                delete PatientSelector._textChangeObservers;
                if (debug)
                    console.log("....PatientSelector.whenSelectorAll found "+PatientSelector.hits.length +" for " + selector + " with text "+textToMatch);
                callback(PatientSelector.hits);
            }

            if (PatientSelector._selected.length) {
                if (PatientSelector._textChangeObservers) {
                    console.error('....PatientSelector._setMutationObservers unexpected _textChangeObservers ', PatientSelector._textChangeObservers);
                }
                PatientSelector._textChangeObservers = PatientSelector._selected.map(PatientSelector._createTextChangeObserver.bind(PatientSelector, textToMatch));
                if (debug) console.log('....PatientSelector._setMutationObservers initial _totalTextChangeObservers ' + PatientSelector._totalTextChangeObservers, PatientSelector);
            } 
            PatientSelector._addedSelectionObserver = new MutationSummary({
                callback: PatientSelector._whenSelectorHits.bind(PatientSelector, textToMatch, PatientSelector._disconnectOnFind.bind(PatientSelector)),
                queries: [
                    {element: selector}
                ]
            });
            if (debug) {
                console.log("....PatientSelector.whenSelectorAll waiting for \'" + selector + "\' with text " + textToMatch + ' in ' + doc());              
            }
        },

        _textSelectorAll: function(nodes, textToMatch) {
               return nodes.reduce(function findTextMatching(nodes, node) {
                    if (node.textContent.indexOf(textToMatch) !== -1)
                        nodes.push(node);
                    return nodes;
                }, []);
        },

        _textChanges: function(textToMatch, callback, mutationSummary) {
            if (debug) console.log("....PatientSelector._textChanges mutationSummary for " + textToMatch, mutationSummary[0]);
            var target = mutationSummary[0].target;
            this.hits = this._textSelectorAll([target], textToMatch);
            if (this.hits.length)
                callback(this.hits);
        },

        _totalTextChangeObservers: 0,

        _createTextChangeObserver: function(textToMatch, element) {
            PatientSelector._totalTextChangeObservers++;
            if (debug) console.log('....PatientSelector._createTextChangeObserver _totalTextChangeObservers ' + PatientSelector._totalTextChangeObservers, PatientSelector);
            var handler = PatientSelector._textChanges.bind(PatientSelector, textToMatch, PatientSelector._disconnectOnFind.bind(PatientSelector));
            var summary = new MutationSummary({
                callback: handler,
                queries:[{characterData: true}],
                rootNode: element
            });
            summary._textToMatch = textToMatch;
            return summary;
        },

        _whenSelectorHits: function(textToMatch, callback, mutationSummary) {
            if (debug) console.log("....PatientSelector._whenSelectorHits mutationSummary for " + textToMatch, mutationSummary[0]);
            var added = mutationSummary[0].added;
            PatientSelector.hits = PatientSelector._textSelectorAll(added, textToMatch);
            if (PatientSelector.hits.length) {
                callback(PatientSelector.hits);
                return;
            }
            added.forEach(function(element) {
                PatientSelector._textChangeObservers = PatientSelector._textChangeObservers || [];
                PatientSelector._textChangeObservers.push(PatientSelector._createTextChangeObserver(textToMatch, element));
            }.bind(PatientSelector));
        },
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

    var PatientEvents = {

        __proto__: PatientSelector,

        _mouseEvent: function(type, elt, callback) {
            function onClick(event) {
                elt.removeEventListener(type, onClick);
                if (callback) {  
                    // allow the click handler to fire before next test step
                    setTimeout(function() {  
                        callback([elt]);
                    });    
                }
            }
            elt.addEventListener(type, onClick);
            var event = document.createEvent("MouseEvent");
            event.initMouseEvent(type, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            elt.dispatchEvent(event);
        },

        mouseToSelector: function(type, selector, textToMatch, callback) {
            if (debug) console.log("....PatientEvents."+type+"Selector(" + selector + ', ' + textToMatch + ')');
            PatientSelector.whenSelectorAll(selector, textToMatch, function() {
                PatientEvents._mouseEvent(type, PatientSelector.hits[0], callback);
                if (debug) 
                    console.log("....PatientEvents."+type+"Selector hit ", PatientSelector.hits[0])
            }.bind(PatientEvents));
        },

        clickSelector: function(selector, textToMatch, callback) {
            PatientEvents.mouseToSelector('click', selector, textToMatch, callback);
        },

        mouseOverSelector: function(selector, textToMatch, callback) {
            PatientEvents.mouseToSelector('mouseover', selector, textToMatch, callback);
        },

        _key: function(keyDescriptor, elt, callback) {
            elt.addEventListener('keyup', function(event) {
                console.log("....PatientEvents._key " + keyDescriptor, event);
                callback([elt]);
            });
            key(keyDescriptor, elt);
        },

        keySelector: function(selector, textToMatch, keyDescriptor, callback) {
            if (debug) console.log("....PatientEvents.keySelector(" + selector + ', ' + keyDescriptor + ')');
            PatientSelector.whenSelectorAll(selector, textToMatch, function() {
                PatientEvents._key(keyDescriptor, PatientSelector.hits[0], callback);
                if (debug) 
                    console.log("....PatientEvents.keySelector hit ", PatientSelector.hits[0])
            }.bind(PatientEvents));
        },

        _moveLineNumber: function(lineNumber, visibleSourceLines, selector, text) {
            while (lineNumber < visibleSourceLines.length) {
                PatientSelector.hits = [visibleSourceLines[lineNumber]];
                // select in line
                var hits = PatientSelector._querySelectorAll('| '+selector, text);
                if (hits.length) {
                    if (debug) console.log('....PatientEvents._moveLineNumber ' + selector + '&' + text + ' match ' + visibleSourceLines[lineNumber].textContent); 
                    lineNumber++;  
                    break;                            
                } else {
                    lineNumber++;
                }
            }
            if (lineNumber === visibleSourceLines.length - 1) {
                console.error("...PatientEvents._moveLineNumber no source line matchs " + selector + ' & ' + text, visibleSourceLines);
            } else {
                return lineNumber;
            }
        },

        _fireMouseMove: function(tokenElt, callback) {
            function onMouseMove(event) {
                tokenElt.removeEventListener('mousemove', onMouseMove);
                var target = event.target;
                PatientSelector.hits = [tokenElt];
                // Allow the mousemove handler to fire before the next test step
                setTimeout(function(){
                    callback(target.textContent + ' in ' + target.parentElement.textContent);    
                });
            }
            tokenElt.addEventListener('mousemove', onMouseMove);
            var xy = getPosition(tokenElt);
            xy.x = xy.x + Math.round(tokenElt.offsetWidth/2) + 1;
            xy.y = xy.y + Math.round(tokenElt.offsetHeight/2);
            var mousemove = document.createEvent("MouseEvent");
            mousemove.initMouseEvent('mousemove', true, true, window, 0, 
                0, 0, xy.x, xy.y, 
                false, false, false, false, 0, null);
            tokenElt.dispatchEvent(mousemove);
            if (debug) console.log('....PatientEvents._fireMouseMove mousemove(' + xy.x + ',' + xy.y + ') sent to %o', tokenElt);
        },
    }

    var PatientEditor = {

        __proto__: PatientSelector,

        ancestor: function(selector, callback) {
            var parent = PatientSelector.hits[0].parentElement;
            while (parent) {
                var hit = parent.querySelector(selector);
                if (debug) console.log("....PatientEvents.ancestor(" + selector + ")  %o " + (hit ? "hit" : "miss"), parent);
                if (hit) {
                    PatientSelector.hits[0] = hit;
                    callback(hit);
                    return;
                }
                parent = parent.parentElement;
            }
            PatientSelector.hits = [];
            callback();
        },

        selectTokenInSource: function(editorTokens, callback) {
            if (debug) console.log("....PatientEvents.selectTokenInSource(" + editorTokens.length + " editorTokens) ", editorTokens);
            var visibleSourceElement = PatientSelector._querySelectorAll('.CodeMirror-lines');
            var visibleSourceLines = PatientSelector._querySelectorAll('| pre');

            function next(lineNumber) {
                var token = editorTokens.shift();
                var selector = token.type;
                var text = token.text;
                    
                if (editorTokens.length) {
                    lineNumber = PatientEvents._moveLineNumber(lineNumber, visibleSourceLines, selector, text);
                    if (lineNumber)
                        next(lineNumber);
                    else 
                        callback('err');
                } else {
                    if (debug) console.log('....PatientEvents.selectTokenInSource seeking pre ancestor of ', PatientSelector.hits);
                    PatientEvents.ancestor('pre', function() {
                        if (!PatientSelector.hits.length) {
                            console.error('....PatientEvents.selectTokenInSource ancestor selection failed', PatientEvents);
                            callback();
                        }
                        // select within the previous hit
                        var tokenElts = PatientSelector._querySelectorAll('| ' + selector, text);
                        var tokenElt = tokenElts[0];
                        if (tokenElts.length > 1) {
                            console.log("tokenElts", tokenElts);
                        }
                        PatientEvents._fireMouseMove(tokenElt, callback);
                    });
                }
            }
            next(0);
        },

        clickTokenInSource: function(editorTokens, callback) {
            PatientEvents.selectTokenInSource(editorTokens, function() {
                PatientEvents._click(PatientSelector.hits[0], callback);
            });
        },

    }

    var PatientRemoteOperations = {

        __proto__: PatientSelector,

        evaluateInPage: function(expr, callback) {
            function checkException(result, isException) {
                if (isException) {
                    console.error("....PatientRemoteOperations.evaluateInPage(" + expr + ") exception", isException);
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
                console.error("....PatientRemoteOperations.evaluate(" + expr + ") exception " + exc, exc);
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
            if (debug) console.log("testResult "+text);
            callback(text);
        },

        extractFromSelection: function(selector, property, callback) {
            var text = PatientSelector._querySelectorAll(selector).map(function(node){
                return node[property];
            }).join('|');
            if (debug) console.log("testResult "+text);
            callback(text);
        },

        extractAttr: function(selector, attr, callback) {
            var text = PatientSelector._querySelectorAll(selector).map(function(node){
                return node.getAttribute(attr);
            }).join('|');
            if (debug) console.log("testResult "+text);
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
                if (debug) console.log("....PatientRemoteOperations.proxyTo.onMessage ", message);
                var payload = message;
                var postId = payload.shift();
                var method = payload.shift();
                var status = payload.shift();
                var handler = PatientRemoteOperations.proxyHandlers[postId];
                if (handler) {
                    if (status === 'Error')
                        handler.onError(payload);
                    else 
                        handler.onResponse(payload);
                    delete PatientSelector.proxyHandlers[postId];                    
                } else {
                    console.error("....PatientRemoteOperations.createProxy.onMessage no handler for " + postId + ' in ' + doc(), message);
                }
            }

            var proxy = PatientRemoteOperations.proxies[iframeURL] = new ChannelPlate.Base(port, onMessage.bind(PatientRemoteOperations));
            if (debug) console.log("....PatientRemoteOperations.createProxy for " + iframeURL);
            // The frame just contacted us, maybe we have a message waiting to send it.
            PatientRemoteOperations._postToProxy(proxy);
        },

        _postToProxy: function(proxy) {
            var handler = PatientRemoteOperations.proxyHandlers[PatientRemoteOperations.postId];
            if (handler && !handler.sent) {
                handler.sent = proxy.postMessage(handler.args);
                if (debug) console.log("....PatientRemoteOperations.proxyTo.postMessage sent: " + handler.sent + " to " + handler.url, handler.args);                
            }
        },

        proxyTo: function(url, proxied, callback, errback) {
            if (debug) console.log("....PatientRemoteOperations.proxyTo " + url, proxied);
            var postId = ++PatientRemoteOperations.postId;
            PatientRemoteOperations.proxyHandlers[postId] = {url: url, onResponse: callback, onError: errback, args: [postId].concat(proxied)};

            var proxy;
            Object.keys(PatientRemoteOperations.proxies).some(function(iframeURL) {
                if (iframeURL.indexOf(url) !== -1) {
                    return proxy = PatientRemoteOperations.proxies[iframeURL];
                }
            }.bind(PatientRemoteOperations));

            if (proxy) {
                PatientRemoteOperations._postToProxy(proxy);
            } else {
                if (debug) console.log("....PatientRemoteOperations.proxyTo waiting for " + url);
            }
        }
    };
    

    global.PatientSelector = PatientSelector;
    global.PatientEvents = PatientEvents;
    global.PatientEditor = PatientEditor;
    global.PatientRemoteOperations = PatientRemoteOperations;

}(this));
