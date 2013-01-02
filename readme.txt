// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

Chrome Devtools extension for Querypoint debugging prototype 

This is not even alpha, it's just my work in progress.

Plan: 

Re-compiles the JavaScript in a web page using the Traceur compiler. 
The result JS is 'lowered', breaking all expressions down into simple
statements. Then the JS syntax tree is analyzed for identifiers selected
by the user for tracing. Re-running the page traces the history of identifiers.

Requires a patched version of Chrome devtools.  
See the devtoolsExtended project

ToDo:
See https://github.com/google/qpp/wiki/_pages

prereq: use Chrome dev channel or trunk build

Install -- use as devtoolsExtended extension (recommended):

0. install devtoolsExtended https://github.com/google/devtoolsExtended
1. clone this repo
2. Open chrome://extensions, developer mode, load unpacked extn, select #1
3. open qpd.html from this project in a web page 
    (I use node on DAVServer.js in directory qpp/http)
4. right click, debug with Devtools Extended. 
The Querypoint panel should be available.

Install -- as devtools extension (not tested at this time)

1. clone this repo
2. Open chrome://extensions, developer mode, load unpacked extn, select #1
3. Open qpd.html
4. Open devtools (F12) on #3.


See also:
 Traceur: https://github.com/johnjbarton/traceur
    (fork of http://code.google.com/p/traceur-compiler/)
 devtoolsExtended: https://github.com/google/devtoolsExtended
 ChannelPlate: https://github.com/google/ChannelPlate
 crx2app: https://github.com/johnjbarton/crx2app
 
