#!/bin/sh

PWD=`pwd`
path=$(basename $PWD)
rm -rf archive/fedtools.tgz
tar --exclude='.git' --exclude='node_modules' --exclude='build.sh' --exclude='archive' -cvzf archive/fedtools.tgz .
