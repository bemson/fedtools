/*jshint node:true, unused:false*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),

  utilities = require('./utilities'),
  log = require('./logs'),
  cmd = require('./commands');

function _cloneTemporayYui(options, done) {
  var randomName = 'wf2-yui3-' + Math.random().toString(),
    temporaryPath = path.join('/tmp', randomName);

  utilities.cloneGitRepository({
    cwd: path.resolve('/tmp'),
    verbose: true,
    url: options.url,
    name: randomName
  }, function (err, data) {
    if (!err) {
      done(null, temporaryPath);
    } else {
      done(err, data);
    }
  });
}


exports.run = function (verbose, pkgConfig, options, done) {
  _cloneTemporayYui({
    url: pkgConfig.wria2yui3giturl
  }, function (err, data) {
    console.log('==> err: ', err);
    console.log('==> data: ', data);
  });
};

exports.cloneTemporayYui = _cloneTemporayYui;
