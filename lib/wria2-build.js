/*jshint node:true, unused:true*/

var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  prompt = require('promptly'),

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities');

function _isComponentPath(done) {
  var cwd = process.cwd(),
    buildJsonFile = cwd + '/build.json',
    metaDir = cwd + '/meta',
    yuiDir = path.join(cwd, '/../yui'),
    loaderDir = path.join(cwd, '/../loader');

  async.waterfall([
      function (callback) {
        if (!fs.existsSync(buildJsonFile) || !fs.existsSync(metaDir)) {
          callback(1);
        } else {
          callback(null);
        }
      },
      function (callback) {
        if (!fs.existsSync(yuiDir) || !fs.existsSync(loaderDir)) {
          callback(1);
        } else {
          callback(null);
        }
      }
    ],
    function (err, data) {
      done(err, data);
    }
  );
}

function _full(verbose, silent, srcPath, done) {
  var shifterCfg;

  async.waterfall([
      function (callback) {
        utilities.getCurrentBranch(function (err, branch) {
          if (err) {
            log.error('Unable to find the current branch of the git repository!');
            log.error(err);
            callback(err);
          } else {
            log.info('About to start a full build for branch \'' + branch + '\'');
            log.echo();
            prompt.confirm('Continue? [Y|n]', {
                'default': true
              },
              function (err, answer) {
                if (!answer) {
                  log.echo('Bye then!');
                  callback(-1);
                } else {
                  callback(null);
                }
              }
            );
          }
        });
      },
      function (callback) {
        var yuiFile = srcPath + '/yui/js/yui.js';

        if (!fs.existsSync(yuiFile)) {
          log.error('Ooops! It looks like you\'re missing key YUI3 source files!');
          callback(-1);
        } else {
          callback(null);
        }
      },
      function (callback) {
        var shifterJsonFile = srcPath + '/.shifter.json';

        if (!fs.existsSync(shifterJsonFile)) {
          log.error('Ooops! It looks like you\'re missing a .shifter.json configuration file!');
          callback(-1);
        } else {
          callback(null, shifterJsonFile);
        }
      },
      function (shifterJsonFile, callback) {
        shifterCfg = JSON.parse(fs.readFileSync(shifterJsonFile, 'utf8'));
        if (shifterCfg && (shifterCfg['replace-wf2_combine'] === 'true') ||
          (shifterCfg['replace-wf2_combine'] === true)) {
          log.warning('Your current configuration is set to use the combo loader');
          log.echo();
          prompt.confirm('Continue? [y|N]', {
              'default': false
            },
            function (err, answer) {
              if (!answer) {
                log.echo('Bye then!');
                callback(-1);
              } else {
                callback(null);
              }
            }
          );
        } else {
          callback(null);
        }
      },
      function (callback) {
        // need to run npm install in the build directory if needed
        var buildPath = path.join(srcPath, '..', '..', 'build'),
          nodeModulesPath = path.join(buildPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          cmd.run('npm install', {
            silent: false,
            inherit: false,
            pwd: buildPath
          }, function (err) {
            if (err) {
              log.error('Unable to install npm packages in the build directory!');
              callback(err);
            } else {
              callback(null);
            }
          });
        } else {
          callback(null);
        }
      },
      function (callback) {
        var cmdline = 'rm -rf ' + path.join(srcPath, '..', 'build');
        cmd.run(cmdline, null, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        var baseCSStmplPath = path.join(srcPath, 'wt2-base-css', 'templates'),
          cmdline = 'mkdir -p ' + baseCSStmplPath;
        if (!fs.existsSync(baseCSStmplPath)) {
          cmd.run(cmdline, null, function (err) {
            if (!err) {
              callback(null);
            } else {
              callback(err);
            }
          });
        } else {
          callback(null);
        }
      },
      function (callback) {
        var buildPath = path.join(srcPath, '..', '..', 'build', 'lib'),
          cmdline = 'node wf2_prebuild_loader_dependencies.js';
        cmd.run(cmdline, {
          pwd: buildPath,
          inherit: verbose,
          silent: silent
        }, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        var buildPath = srcPath,
          cmdline = 'shifter --coverage false --lint false --csslint false --walk';
        cmd.run(cmdline, {
          pwd: buildPath,
          inherit: verbose,
          silent: silent
        }, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      }
    ],
    function (err, data) {
      done(err, data);
    }
  );
}

function _solo(verbose, silent, done) {
  var cwd = process.cwd(),
    yuiDir = path.join(cwd, '/../yui'),
    loaderDir = path.join(cwd, '/../loader');

  async.waterfall([
      function (callback) {
        utilities.getCurrentBranch(function (err, branch) {
          if (err) {
            log.error('Unable to find the current branch of the git repository!');
            log.error(err);
            callback(err);
          } else {
            log.info('About to build \'' + path.basename(cwd) +
              '\' on branch \'' + branch + '\'');
            log.echo();
            prompt.confirm('Continue? [Y|n]', {
                'default': true
              },
              function (err, answer) {
                if (!answer) {
                  log.echo('Bye then!');
                  callback(-1);
                } else {
                  callback(null);
                }
              }
            );
          }
        });
      },
      function (callback) {
        var cmdline = 'shifter --lint-stderr';
        log.notice('Running 3 shifters for ' + path.basename(cwd) +
          ', yui, and loader...');
        cmd.run(cmdline, {
          inherit: verbose,
          silent: silent
        }, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        var cmdline = 'shifter';
        cmd.run(cmdline, {
          pwd: yuiDir,
          inherit: verbose,
          silent: silent
        }, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        var cmdline = 'shifter';
        cmd.run(cmdline, {
          pwd: loaderDir,
          inherit: verbose,
          silent: silent
        }, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      }
    ],
    function (err, data) {
      done(err, data);
    }
  );
}

exports.run = function (verbose, done) {
  // Depending on where the command is run, we are going to decide if we
  // have to run a full build, or just a single component build.
  var silent = false;

  if (process.platform === 'win32') {
    verbose = true;
    silent = true;
  }

  async.waterfall([
    function (callback) {
      _isComponentPath(function (err) {
        if (!err) {
          // This is a component path! Let's build it.
          _solo(verbose, silent, callback);
        } else {
          // This is not a component path...
          // Can we do a full build instead?
          utilities.getWF2srcPath(function (err, srcPath) {
            if (err) {
              // nothing we can do there...
              log.error('The current path cannot be built. Is it a wria2 path?');
              callback(-1);
            } else {
              _full(verbose, silent, srcPath, callback);
            }
          });
        }
      });
    }
  ], function (err, data) {
    done(err, data);
  });

};
