/*jshint node:true, unused:false*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),
  async = require('async'),
  ncp = require('ncp').ncp,

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

function _promptForCloneOrExisting(done) {
  log.echo(
    'Do you have an existing (E) copy of YUI3 or do you want to clone (C) a temporary one?');
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Please make your choice [C|e]:',
    defaultValue: 'C',
    validator: function (value) {
      value = value.toUpperCase();
      if (value !== 'C' && value !== 'E') {
        throw new Error();
      } else {
        return value;
      }
    }
  }, done);
}

function _promptForYUIPath(done) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Type the path to your local YUI3 repository:',
    validator: function (value) {
      var yuiFile = path.join(value, 'src', 'yui', 'js', 'yui.js');
      if (!fs.existsSync(value) || !fs.existsSync(yuiFile)) {
        log.error('Invalid path, please enter an existing YUI3 path');
        throw new Error();
      } else {
        return value;
      }
    }
  }, done);
}

function _promptForWF2Path(done) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Type the path to your local WRIA2 repository:',
    validator: function (value) {
      var shifterJsonFile = path.join(value, 'wf2', 'src', '.shifter.json');
      if (!fs.existsSync(value) || !fs.existsSync(shifterJsonFile)) {
        log.error('Invalid path, please enter an existing WRIA2 path');
        throw new Error();
      } else {
        return value;
      }
    }
  }, done);
}

function _promptForBranch(done) {

}

function _copyYUItoWF2(yui3Path, wf2Path, done) {
  var srcPath = path.join(yui3Path, 'src'),
    dstPath = path.join(wf2Path, 'wf2', 'src');
  ncp(srcPath, dstPath, function (err) {
    if (err) {
      log.error(err);
      done(err);
    } else {
      log.success('YUI3 source copied successfully');
      done(null);
    }
  });
}

exports.run = function (verbose, pkgConfig, options, done) {

  async.waterfall([

    function (callback) {
      _promptForCloneOrExisting(callback);
    },
    function (arg, callback) {
      if (arg === 'E') {
        _promptForYUIPath(callback);
      } else {
        _cloneTemporayYui({
          url: pkgConfig.wria2yui3giturl
        }, function (err, data) {
          console.log('==> err: ', err);
          console.log('==> data: ', data);
          callback(err, data);
        });
      }
    },
    function (yui3Path, callback) {
      _promptForWF2Path(function (err, wf2Path) {
        callback(err, wf2Path, yui3Path);
      });
    },
    function (wf2Path, yui3Path, callback) {
      _copyYUItoWF2(yui3Path, wf2Path, callback);
    }
  ], function (err, data) {
    // data === 'done'
    done(err, data);
  });

};

exports.cloneTemporayYui = _cloneTemporayYui;
exports.copyYUItoWF2 = _copyYUItoWF2;
