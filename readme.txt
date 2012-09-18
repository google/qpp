// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2012 Google Inc. johnjbarton@google.com

Chrome Devtools extension for Querypoint debugging prototype 

Re-compiles the JavaScript in a web page using the Traceur compiler. 
The result JS is 'lowered', breaking all expressions down into simple
statements. Then the JS syntax tree is analyzed for identifiers selected
by the user for tracing. Re-running the page traces the history of identifiers.

Requires a patched version of Chrome devtools.  
See the devtoolsExtended project

ToDo:
Integrate CodeMirror
Instrument editor mouse-over to give transcoded output lines
Right click on editor to select identifier to trace
UI for result trace.

Install -- use as devtoolsExtended extension:

0. install devtoolsExtended
1. clone this repo
2. Open chrome://extensions, developer mode, load unpacked extn, select #1
3. Still in chrome://extensions, open devtoolsExtended -> options, 
4. Edit the qpp extension choice, chenge enabled to 'yes', save.
5. open qpd.html from this project in a web page
6. right click, debug with Devtools Extended. 
The Querypoint panel should be available.

Install -- as devtools extension (not tested at this time)

1. clone this repo
2. Open chrome://extensions, developer mode, load unpacked extn, select #1
3. Open qpd.html
4. Open devtools (F12) on #3.


Today you should see a bunch of console message if you open devtools on devtools.
Control+o does not work unless you use devtoolsExtended.

See also:
 Traceur: http://code.google.com/p/traceur-compiler/
 devtoolsExtended: https://github.com/google/devtoolsExtended Coming Soon ;-)
