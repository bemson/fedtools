/*jshint node:true, unused:false*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),
  async = require('async'),
  ncp = require('ncp').ncp,

  utilities = require('./utilities'),
  gith = require('./git-helper'),
  log = require('./logs'),
  cmd = require('./commands'),

  cwd = process.cwd(),
  YUI3_CLONE,
  YUI3_EXISTING;

YUI3_CLONE = exports.YUI3_CLONE = 'C';
YUI3_EXISTING = exports.YUI3_EXISTING = 'E';

function _cloneTemporayYui(options, done) {
  var randomName = 'wf2-yui3-' + Math.random().toString(),
    temporaryPath = path.join('/tmp', randomName);

  gith.cloneGitRepository({
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
  log.echo('Do you have an existing (' +
    YUI3_EXISTING + ') copy of YUI3 or do you want to clone (' +
    YUI3_CLONE + ') a temporary one?');

  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Please make your choice [' +
      YUI3_CLONE + '|' + YUI3_EXISTING.toLowerCase() + ']:',
    defaultValue: YUI3_CLONE,
    validator: function (value) {
      value = value.toUpperCase();
      if (value !== YUI3_CLONE && value !== YUI3_EXISTING) {
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
    promptMsg: 'Type the path to your local YUI3 repository, or ENTER to use the current path:',
    defaultValue: cwd,
    validator: function (value) {
      value = utilities.resolvePath(value);
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
    promptMsg: 'Type the path to the root of your local WRIA2 repository, or ENTER to use the current path:',
    defaultValue: cwd,
    validator: function (value) {
      value = utilities.resolvePath(value);
      var shifterJsonFile = path.join(value, 'wf2', 'src', '.shifter.json');
      if (!fs.existsSync(value) || !fs.existsSync(shifterJsonFile)) {
        log.error('Invalid path, please enter an existing WRIA2 root path');
        throw new Error();
      } else {
        return value;
      }
    }
  }, done);
}

function _promptForBranch(pkgConfig, done) {
  var msg = 'Please type the name of the branch you want to checkout,' +
    ' or ENTER to use the default one ';

  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: msg + '[' + pkgConfig.defaultBranch + ']:',
    defaultValue: pkgConfig.defaultBranch
  }, done);
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

function _gatherYuiOptions(verbose, pkgConfig, options, done) {
  async.waterfall([

    function (callback) {
      _promptForCloneOrExisting(callback);
    },
    function (arg, callback) {
      if (arg === YUI3_EXISTING) {
        _promptForYUIPath(callback);
      } else {
        _cloneTemporayYui({
          url: pkgConfig.wria2yui3giturl
        }, function (err, data) {
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
      _promptForBranch(pkgConfig, function (err, branch) {
        callback(err, branch, wf2Path, yui3Path);
      });
    }
  ], function (err, branch, wf2Path, yui3Path) {
    done(err, branch, wf2Path, yui3Path);
  });
}

exports.run = function (verbose, pkgConfig, options, done) {
  async.waterfall([

    function (callback) {
      _gatherYuiOptions(verbose, pkgConfig, options, callback);
    },
    function (branch, wf2Path, yui3Path, callback) {
      log.echo();
      log.echo('Spinning wheels, please be patient...');
      gith.checkoutBranch({
        cwd: wf2Path,
        branch: branch
      }, function (err) {
        callback(err, branch, wf2Path, yui3Path);
      });
    },
    function (branch, wf2Path, yui3Path, callback) {
      gith.checkoutBranch({
        cwd: yui3Path,
        branch: 'wf2-' + branch
      }, function (err) {
        callback(err, branch, wf2Path, yui3Path);
      });
    },
    function (branch, wf2Path, yui3Path, callback) {
      _copyYUItoWF2(yui3Path, wf2Path, callback);
    }
  ], function (err, data) {
    done(err, data);
  });
};

exports.cloneTemporayYui = _cloneTemporayYui;
exports.copyYUItoWF2 = _copyYUItoWF2;
exports.gatherYuiOptions = _gatherYuiOptions;
exports.promptForCloneOrExisting = _promptForCloneOrExisting;
exports.promptForYUIPath = _promptForYUIPath;
