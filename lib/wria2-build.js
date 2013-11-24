/*jshint node:true, unused:true*/

var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore'),
  prompt = require('promptly'),

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities'),
  gith = require('./git-helper'),

  cwd = process.cwd();

function _isComponentPath(options, done) {
  var buildPath = (options && options.cwd) ? options.cwd : cwd,
    buildJsonFile = buildPath + '/build.json',
    metaDir = buildPath + '/meta',
    yuiDir = path.join(buildPath, '/../yui'),
    loaderDir = path.join(buildPath, '/../loader');

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

function _full(options, done) {
  var shifterCfg,
    comboFlag,
    SHIFTER = 'shifter';

  if (!_.isUndefined(options.combo) && _.isBoolean(options.combo)) {
    comboFlag = options.combo;
  }
  async.waterfall([

      function (callback) {
        gith.getCurrentBranch({
          cwd: options.srcPath
        }, function (err, branch) {
          if (err) {
            log.error('Unable to find the current branch of the git repository!');
            log.error(err);
            callback(err);
          } else {
            if (options.prompt) {
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
            } else {
              callback(null);
            }
          }
        });
      },
      function (callback) {
        var yuiFile = path.join(options.srcPath, 'yui', 'js', 'yui.js');

        if (!fs.existsSync(yuiFile)) {
          log.error('Ooops! It looks like you\'re missing key YUI3 source files!');
          callback(-1);
        } else {
          callback(null);
        }
      },
      function (callback) {
        var shifterJsonFile = options.srcPath + '/.shifter.json';

        if (!fs.existsSync(shifterJsonFile)) {
          log.error('Ooops! It looks like you\'re missing a .shifter.json configuration file!');
          callback(-1);
        } else {
          callback(null, shifterJsonFile);
        }
      },
      function (shifterJsonFile, callback) {
        shifterCfg = JSON.parse(fs.readFileSync(shifterJsonFile, 'utf8'));

        if (options.prompt) {
          if (shifterCfg && (shifterCfg['replace-wf2_combine'] === 'true') ||
            (shifterCfg['replace-wf2_combine'] === true)) {
            log.warning('Your current configuration is set to use the combo loader');
            log.echo();

            utilities.promptAndContinue({
              promptType: utilities.PROMPT_PROMPT,
              promptMsg: 'Do you want to continue [y|n] or disable it [D]?',
              defaultValue: 'd',
              validator: function (value) {
                value = value.toLowerCase();
                if (value.match(/y|n|d/)) {
                  switch (value) {
                  case 'y':
                    return true;
                  case 'n':
                    return false;
                  case 'd':
                    shifterCfg['replace-wf2_combine'] = 'false';
                    fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg));
                    return true;
                  }
                } else {
                  throw new Error();
                }
              }
            }, function (err, value) {
              if (err) {
                callback(err);
              } else {
                if (value) {
                  callback(null);
                } else {
                  log.echo('Bye then...');
                  callback(-1);
                }
              }
            });
          } else {
            callback(null);
          }
        } else {
          // no prompt. if comboFlag is set, use it,
          // otherwise, just start the build
          if (_.isBoolean(comboFlag)) {
            shifterCfg['replace-wf2_combine'] = comboFlag.toString();
            fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg));
          }
          callback(null);
        }
      },
      function (callback) {
        // need to run npm install in the build directory if needed
        var buildPath = path.join(options.srcPath, '..', '..', 'build'),
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
        var cmdline = 'rm -rf ' + path.join(options.srcPath, '..', 'build');
        cmd.run(cmdline, null, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        var baseCSStmplPath = path.join(options.srcPath, 'wt2-base-css', 'templates'),
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
        var buildPath = path.join(options.srcPath, '..', '..', 'build', 'lib'),
          cmdline = 'node wf2_prebuild_loader_dependencies.js';
        cmd.run(cmdline, {
          pwd: buildPath,
          inherit: options.verbose,
          silent: options.silent
        }, function (err) {
          if (!err) {
            callback(null);
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        var buildPath = options.srcPath,
          cmdline = SHIFTER + ' --coverage false --lint false --csslint false --walk';
        cmd.run(cmdline, {
          pwd: buildPath,
          inherit: options.verbose,
          silent: options.silent
        }, function (err, data) {
          if (!err) {
            callback(null);
          } else {
            callback(err, data);
          }
        });
      }
    ],
    function (err, data) {
      done(err, data);
    }
  );
}

function _solo(verbose, silent, options, done) {
  var buildPath = (options && options.cwd) ? options.cwd : cwd,
    yuiDir = path.join(buildPath, '/../yui'),
    loaderDir = path.join(buildPath, '/../loader'),
    SHIFTER = 'shifter';

  async.waterfall([

      function (callback) {
        gith.getCurrentBranch({
          cwd: buildPath
        }, function (err, branch) {
          if (err) {
            log.error('Unable to find the current branch of the git repository!');
            log.error(err);
            callback(err);
          } else {
            log.info('About to build \'' + path.basename(buildPath) +
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
        var cmdline = SHIFTER + ' --lint-stderr';
        log.notice('Running shifters for ' + path.basename(buildPath) +
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
        var cmdline = SHIFTER;
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
        var cmdline = SHIFTER;
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

exports.run = function (verbose, options, done) {
  // Depending on where the command is run, we are going to decide if we
  // have to run a full build, or just a single component build.
  var silent = false,
    promptOption;

  if (process.platform === 'win32') {
    verbose = true;
    silent = true;
    process.env.PATH = path.join(__dirname, '..', 'node_modules', '.bin') + ';' +
      process.env.PATH;
  } else {
    process.env.PATH = path.join(__dirname, '..', 'node_modules', '.bin') + ':' +
      process.env.PATH;
  }

  async.waterfall([

    function (callback) {
      _isComponentPath(options, function (err) {
        if (!err) {
          // This is a component path! Let's build it.
          _solo(verbose, silent, options, callback);
        } else {
          // This is not a component path...
          // Can we do a full build instead?
          utilities.getWF2srcPath({
            cwd: (options && options.cwd) ? options.cwd : cwd
          }, function (err, srcPath) {
            if (err) {
              // nothing we can do there...
              log.error('The current path cannot be built. Is it a wria2 path?');
              callback(-1);
            } else {
              if (_.isUndefined(options.prompt)) {
                promptOption = true;
              } else {
                promptOption = options.prompt;
              }
              _full({
                verbose: verbose,
                silent: silent,
                srcPath: srcPath,
                prompt: _.isBoolean(promptOption) ? promptOption : true,
                combo: options.combo
              }, callback);
            }
          });
        }
      });
    }
  ], function (err, data) {
    done(err, data);
  });

};
