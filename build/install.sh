#!/bin/bash

DEVTOOLSSAVE="git clone https://code.google.com/r/johnjbarton-devtools-save/"
QPP="git clone https://github.com/google/qpp.git"
DEVTOOLS="git clone https://github.com/google/devtoolsExtended.git "

SRCDIR="src"
REPODIR="build"
EXTENSIONDIR="extension"

mkdir $REPODIR
cd $REPODIR
$DEVTOOLS
$QPP
$DEVTOOLSSAVE

cd "devtoolsExtended/"
git checkout atopwi
cd ../..

mkdir $EXTENSIONDIR
cp -r $REPODIR/devtoolsExtended/extension/* $EXTENSIONDIR
cp -r $REPODIR/qpp/[^b]* $EXTENSIONDIR
cp -r $REPODIR/johnjbarton-devtools-save/extension/* $EXTENSIONDIR

cp $SRCDIR/*{js,json,html} $EXTENSIONDIR

