/*jshint node:true, unused:true*/

var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore'),
  prompt = require('promptly'),
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities'),
  gith = require('./git-helper'),
  TYPE_WATCH,
  TYPE_BUILD,

  cwd = process.cwd();

exports.TYPE_WATCH = TYPE_WATCH = 'W';
exports.TYPE_BUILD = TYPE_BUILD = 'B';

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

function _installLocalNpmPackages(srcPath, done) {
  var nodeModulesPath = path.join(srcPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    cmd.run('npm install', {
      silent: false,
      inherit: false,
      pwd: srcPath
    }, function (err) {
      if (err) {
        log.error('Unable to install npm packages!');
        done(err);
      } else {
        done(null);
      }
    });
  } else {
    done(null);
  }
}
exports.installLocalNpmPackages = _installLocalNpmPackages;

function _full(options, done) {
  var shifterCfg,
    comboFlag,
    wf2srcPath,
    SHIFTER = 'shifter',
    message = (options.type === TYPE_WATCH) ? 'watch' : 'build',
    fullBuild = [],
    fullWatch = [];

  if (!_.isUndefined(options.combo) && _.isBoolean(options.combo)) {
    comboFlag = options.combo;
  }

  fullWatch = [

    function (callback) {
      var cmdline = SHIFTER + ' --watch';
      log.notice('Shifter is going to watch your code...');
      cmd.run(cmdline, {
        pwd: wf2srcPath,
        inherit: true,
        silent: true
      }, function (err) {
        if (!err) {
          callback(null);
        } else {
          callback(err);
        }
      });
    }
  ];

  fullBuild = [

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
      var buildPath = path.join(options.srcPath, '..', '..', 'build');
      _installLocalNpmPackages(buildPath, callback);
    },
    function (callback) {
      rimraf(path.join(options.srcPath, '..', 'build'), callback);
    },
    function (callback) {
      var baseCSStmplPath = path.join(options.srcPath, 'wt2-base-css', 'templates');
      if (!fs.existsSync(baseCSStmplPath)) {
        mkdirp(baseCSStmplPath, callback);
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
  ];


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
              log.info('About to start a full ' + message + ' for branch \'' + branch + '\'');
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
              // go without prompting
              callback(null);
            }
          }
        });
      },
      function (callback) {
        utilities.getWF2srcPath({
          cwd: options.srcPath
        }, callback);
      },
      function (srcPath, callback) {
        wf2srcPath = srcPath;
        if (options.type === TYPE_WATCH) {
          async.waterfall(fullWatch, callback);
        } else {
          async.waterfall(fullBuild, callback);
        }
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
    SHIFTER = 'shifter',
    message = (options.type === TYPE_WATCH) ? 'watch' : 'build',
    soloBuild = [],
    soloWatch = [];

  soloWatch = [

    function (callback) {
      var cmdline = SHIFTER + ' --watch';
      log.notice('Shifter is going to watch your code...');
      cmd.run(cmdline, {
        inherit: true,
        silent: true
      }, function (err) {
        if (!err) {
          callback(null);
        } else {
          callback(err);
        }
      });
    }
  ];

  soloBuild = [

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
  ];


  gith.getCurrentBranch({
    cwd: buildPath
  }, function (err, branch) {
    if (err) {
      log.error('Unable to find the current branch of the git repository!');
      log.error(err);
      done(err);
    } else {
      log.info('About to ' + message + ' \'' + path.basename(buildPath) +
        '\' on branch \'' + branch + '\'');
      log.echo();
      prompt.confirm('Continue? [Y|n]', {
          'default': true
        },
        function (err, answer) {
          if (!answer) {
            log.echo('Bye then!');
            done(-1);
          } else {
            if (options.type === TYPE_WATCH) {
              async.waterfall(soloWatch, function (err, data) {
                done(err, data);
              });
            } else {
              async.waterfall(soloBuild, function (err, data) {
                done(err, data);
              });
            }
          }
        }
      );
    }
  });


}

exports.run = function (verbose, options, done) {
  // Depending on where the command is run, we are going to decide if we
  // have to run a full build, or just a single component build.
  var silent = false,
    promptOption,
    runType = TYPE_BUILD;

  if (!_.isUndefined(options.type) &&
    (options.type === TYPE_WATCH || options.type === TYPE_BUILD)) {
    runType = options.type;
  } else {
    options.type = runType;
  }

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
          // This is a component path!
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
                type: options.type,
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
