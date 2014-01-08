/*jshint node:true, unused:true*/

var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore'),
  prompt = require('promptly'),
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),
  log = require('fedtools-logs'),
  cmd = require('fedtools-commands'),
  mustache = require('mustache'),

  utilities = require('./utilities'),
  yui3Utils = require('./yui3-utils'),
  gith = require('./git-helper'),
  TYPE_WAR = 'War',
  TYPE_WATCH = 'Watch',
  TYPE_BUILD = 'Build',
  TYPE_SOY = 'Soy',
  TYPE_SERVER = 'Server',
  TYPE_WAR_BUILD_REMOTE = 'j',
  TYPE_WAR_BUILD_LOCAL = 'l',
  cwd = process.cwd(),
  tmpDir = utilities.getTemporaryDir(),
  SERVER_TYPE_SELLECK = 'selleck',
  SERVER_TYPE_YUIDOC = 'yuidoc',
  servers = {},
  tmpBuildDirName,
  userChoices = {
    branch: '',
    yuiBranch: '',
    tmpClonePath: ''
  };

servers[SERVER_TYPE_SELLECK] = {
  'name': 'Selleck',
  'command': 'selleck',
  'args': '-s -p wf2-common/docs/'
};
servers[SERVER_TYPE_YUIDOC] = {
  'name': 'YUI docs',
  'command': 'yuidoc',
  'args': '. --server 3030 -c .yuidoc.json -q'
};

exports.TYPE_WATCH = TYPE_WATCH;
exports.TYPE_BUILD = TYPE_BUILD;
exports.TYPE_WAR = TYPE_WAR;
exports.TYPE_SOY = TYPE_SOY;

exports.TYPE_SERVER = TYPE_SERVER;
exports.SERVER_TYPE_SELLECK = SERVER_TYPE_SELLECK;
exports.SERVER_TYPE_YUIDOC = SERVER_TYPE_YUIDOC;

function _isComponentPath(options, done) {
  var buildPath = (options && options.cwd) ? options.cwd : cwd,
    buildJsonFile = buildPath + '/build.json',
    metaDir = buildPath + '/meta',
    yuiDir = path.join(buildPath, '/../yui'),
    loaderDir = path.join(buildPath, '/../loader');

  async.waterfall([

      function (callback) {
        if (!fs.existsSync(buildJsonFile)) {
          callback(1);
        } else {
          callback(null);
        }
      },
      function (callback) {
        if (!fs.existsSync(metaDir)) {
          callback(2);
        } else {
          callback(null);
        }
      },
      function (callback) {
        if (!fs.existsSync(yuiDir)) {
          callback(3);
        } else {
          callback(null);
        }
      },
      function (callback) {
        if (!fs.existsSync(loaderDir)) {
          callback(4);
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

function _checkAndPromptForComboFlag(shifterJsonFile, shifterCfg, done) {
  var comboFlag,
    COMBO_ENABLED = 'e',
    COMBO_DISABLED = 'd',
    disableMessage = 'Do you want to continue [c], abord [a] or disable it [' +
      COMBO_DISABLED.toUpperCase() + ']?',
    enableMessage = 'Do you want to continue [C], abord [a] or enable it [' +
      COMBO_ENABLED.toLowerCase() + ']?';

  if (shifterCfg['replace-wf2_combine'] === 'true' ||
    shifterCfg['replace-wf2_combine'] === true) {
    comboFlag = true;
    log.warning('With the current configuration, the build WILL use the Combo Loader');
  } else {
    comboFlag = false;
    log.warning('With the current configuration, the build will NOT use the Combo Loader');
  }
  log.echo();

  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: (comboFlag) ? disableMessage : enableMessage,
    defaultValue: (comboFlag) ? COMBO_DISABLED : 'c',
    validator: function (value) {
      value = value.toLowerCase();
      switch (value) {
      case 'a':
        return false;
      case 'c':
        return true;
      case COMBO_DISABLED:
        shifterCfg['replace-wf2_combine'] = 'false';
        fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg, null, 2));
        return true;
      case COMBO_ENABLED:
        shifterCfg['replace-wf2_combine'] = 'true';
        fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg, null, 2));
        return true;
      default:
        // invalid entry, just display the prompt again
        throw new Error();
      }
    }
  }, function (err, result) {
    if (err) {
      done(err);
    } else {
      if (result) {
        done(null);
      } else {
        log.echo('Bye then...');
        done(-1);
      }
    }
  });
}

function _gatherUserChoicesForWar(options, done) {
  async.waterfall([

      function (callback) {
        if (options.username && options.wriaBranch && options.yuiBranch) {
          userChoices.username = options.username;
          userChoices.branch = options.wriaBranch;
          userChoices.yuiBranch = options.yuiBranch;
          userChoices.buildLocation = 'j';
          userChoices.remote = true;
          callback(-1);
        } else {
          callback();
        }
      },
      function (callback) {
        // if we are in a wria2 git repo, trying to extract the username
        var msg = 'Type your username:',
          awk = (process.platform === 'win32') ? 'gawk' : 'awk',
          res, cmdline;

        utilities.getWF2srcPath({
          cwd: process.cwd()
        }, function (err) {
          if (!err) {
            cmdline =
              'git remote -v | grep origin | grep fetch | ' +
              awk + ' -F\':\' \'{print $2}\' | ' +
              awk + ' -F\'/\' \'{print $1}\'';

            res = cmd.run(cmdline, {
              cwd: process.cwd(),
              status: false,
              verbose: false
            });

            if (res.output && res.output !== '') {
              userChoices.username = res.output.replace(/\n/, '').replace(/\r/, '');
              msg = 'Type your username, or ENTER for default [' +
                userChoices.username + ']:';
              callback(null, msg);
            } else {
              callback(null, msg);
            }
          } else {
            callback(null, msg);
          }
        });
      },
      function (msg, callback) {
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
          defaultValue: userChoices.username
        }, function (err, value) {
          if (value) {
            userChoices.username = value;
          }
          callback(null);
        });
      },
      function (callback) {
        var msg = 'Type the WFRIA2 branch you want to build:';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
        }, function (err, value) {
          if (value) {
            userChoices.branch = value;
          }
          callback();
        });
      },
      function (callback) {
        var msg = 'Type the YUI3 branch you need, or ENTER for default [' +
          'wf2-' + options.pkgConfig.defaultBranch + ']:';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
          defaultValue: 'wf2-' + options.pkgConfig.defaultBranch
        }, function (err, value) {
          if (value) {
            userChoices.yuiBranch = value;
          }
          callback();
        });
      },
      function (callback) {
        if (process.platform === 'win32') {
          log.notice('The WAR build will run directly on Jenkins');
          userChoices.buildLocation = TYPE_WAR_BUILD_REMOTE;
          callback();
        } else {
          var msg = 'Run the build locally [' + TYPE_WAR_BUILD_LOCAL.toUpperCase() +
            '] or on Jenkins [' + TYPE_WAR_BUILD_REMOTE.toUpperCase() + ']:';
          utilities.promptAndContinue({
            promptType: utilities.PROMPT_PROMPT,
            promptMsg: msg,
            validator: function (value) {
              value = value.toLowerCase();
              if (value !== TYPE_WAR_BUILD_REMOTE && value !== TYPE_WAR_BUILD_LOCAL) {
                log.error('Please choose [' +
                  TYPE_WAR_BUILD_LOCAL + ']ocal or [' + TYPE_WAR_BUILD_REMOTE + ']enkins...'
                );
                throw new Error();
              } else {
                return value;
              }
            }
          }, function (err, value) {
            if (value) {
              userChoices.buildLocation = value;
            }
            callback();
          });
        }
      }
    ],
    function (err) {
      if (err === -1) {
        done();
      } else {
        done(err);
      }
    });
}

function _war(options, done) {
  var shifterCfg,
    comboFlag = true,
    packageVersion,
    pkgConfig = options.pkgConfig,
    fullWar = [];

  fullWar = [

    function (callback) {
      _gatherUserChoicesForWar(options, callback);
    },
    function (callback) {
      var res, cmdline, time,
        cmdlineTpl = 'ssh -l {{jenkinsusername}} {{jenkinshostname}} ' +
          '"' +
          'source ~/.bash_profile; ' +
          'fedtools war -u {{username}} -w {{wriaBranch}} -y {{yuiBranch}}' +
          '"';

      if (userChoices.remote) {
        callback();
      } else {
        if (userChoices.buildLocation === 'j') {
          cmdline = mustache.render(cmdlineTpl, {
            jenkinsusername: pkgConfig.jenkinsusername,
            jenkinshostname: pkgConfig.jenkinshostname,
            username: userChoices.username,
            wriaBranch: userChoices.branch,
            yuiBranch: userChoices.yuiBranch
          });

          console.log('==> cmdline: ', cmdline);
          // cmdline = 'ssh -l ' + pkgConfig.jenkinsusername +
          //   'linux "source ~/.profile; fedtools war' +
          //   ' -u ' + userChoices.username +
          //   ' -w ' + userChoices.branch +
          //   ' -y ' + userChoices.yuiBranch + '"';

          log.info('Running WAR build for ' +
            userChoices.username + ' on Jenkins server...');
          res = cmd.run(cmdline, {
            status: false
          });

          console.log('==> res: ', res);
          if (res) {
            if (res.code !== 0) {
              log.error('There was a problem with the build');
              if (res.output) {
                log.notice('Here are the logs:');
                log.echo(res.output);
              } else {
                log.error('And there are no logs, so good luck...');
              }
            } else {
              log.success('Remote WAR build is complete!');
              // TODO scp file back
            }
          } else {
            log.error('There was a problem with the build');
            log.error('And there are no logs, so good luck...');
          }
          callback(-1);
        } else {
          time = (process.platform === 'win32') ? 22 : 10;
          log.info('Estimated time remaining: ' + time + ' minutes');
          utilities.promptAndContinue({
            promptType: utilities.PROMPT_CONFIRM,
            promptMsg: 'Continue? [Y|n]',
            defaultValue: true
          }, function (err, value) {
            if (!value) {
              log.echo('Bye then...');
              callback(-1);
            } else {
              callback();
            }
          });
        }
      }
    },
    function (callback) {
      // setting up the temporary build folder
      // making unique to the user
      tmpBuildDirName = 'build_tmp_' + userChoices.username;
      userChoices.tmpClonePath = path.join(tmpDir, tmpBuildDirName);
      callback();
    },
    function (callback) {
      // need to cleanup the temporary directory if it exists
      log.info('Cleaning up temporary directory...');
      rimraf(userChoices.tmpClonePath, callback);
    },
    function (callback) {
      // need to do a shallow clone into a temporary directory
      gith.cloneGitRepository({
        cloneArgs: '--depth 1 --branch ' + userChoices.branch,
        cwd: tmpDir,
        verbose: true,
        status: true,
        name: tmpBuildDirName,
        url: mustache.render(options.pkgConfig.wria2giturl, {
          gitlabId: userChoices.username
        })
      }, function (err, data) {
        if (!err) {
          callback(null, 'Repository cloned in temporary location...');
        } else {
          callback(err, data);
        }
      });
    },
    function (msg, callback) {
      log.success(msg);
      // need to set combo flag to true
      var shifterJsonFile = path.join(userChoices.tmpClonePath,
        'wf2', 'src', '/.shifter.json');
      shifterCfg = JSON.parse(fs.readFileSync(shifterJsonFile, 'utf8'));
      shifterCfg['replace-wf2_combine'] = comboFlag.toString();
      fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg, null, 2));

      // and grab the version
      packageVersion = shifterCfg['replace-wf2_version'];

      callback(null, 'Combo flag set to true...');
    },
    function (msg, callback) {
      log.success(msg);
      // need to build the npm packages under build
      var buildPath = path.join(userChoices.tmpClonePath, 'build');
      utilities.installLocalNpmPackages(buildPath, function (err) {
        callback(err);
      });
    },
    function (callback) {
      // need to do a shallow clone of yui3
      yui3Utils.cloneTemporaryYui({
        branch: userChoices.yuiBranch,
        url: options.pkgConfig.wria2yui3giturl
      }, function (err, yui3path) {
        if (!err) {
          log.success('YUI3 cloned successfully...');
        }
        callback(err, yui3path);
      });
    },
    function (yui3path, callback) {
      // copy the yui source files to wf2/src
      yui3Utils.copyYUItoWF2(yui3path, userChoices.tmpClonePath, function (err) {
        callback(err, yui3path);
      });
    },
    function (yui3path, callback) {
      // need to start the rest of the build with maven
      log.info('Running maven WAR build, time to grab a coffee...');

      var opt = (process.platform === 'win32') ?
        ' -c \'"../../../wria/combo?basePath=@WF2_VERSION@/build&"\'' :
        ' -c "../../../wria/combo?basePath=@WF2_VERSION@/build&"',
        cmdline = 'node build/lib/package.js' + opt +
          ' -l -i ' + userChoices.branch + '-' + userChoices.username +
          ' -o ' + process.cwd();

      cmd.run(cmdline, {
        pwd: userChoices.tmpClonePath,
        verbose: false,
        status: false
      }, function (err, stderr) {
        if (err) {
          if (stderr) {
            log.echo(stderr);
          }
          callback(err, yui3path);
        } else {
          callback(null, yui3path);
        }
      });
    },
    function (yui3path, callback) {
      var war, src, dst;

      war = packageVersion + '-' + userChoices.branch + '-' + userChoices.username + '.war';
      src = path.join(userChoices.tmpClonePath, 'wt2',
        'wria2-documentation', 'target', 'wria2-documentation.war');


      if (userChoices.remote) {
        dst = path.join(utilities.getHomeDir(), war);
      } else {
        dst = path.join(process.cwd(), war);
      }

      if (fs.existsSync(src)) {
        // file was not moved, let's do it
        fs.renameSync(src, dst);
        log.success('WAR file built successfully!');
        log.echo();
        log.echo('WAR file: ', war);
        log.echo('WAR path: ' + process.cwd());
        log.echo();
        log.notice('You may want to remove the cloned temp repos: ');
        log.echo(path.resolve(userChoices.tmpClonePath));
        log.echo(path.resolve(yui3path));
      } else {
        log.warning('Oops, cannot find the WAR file...');
        log.warning('You may want to run the build yourself?');
        log.warning('The temporary clone folder is:');
        log.echo(path.resolve(userChoices.tmpClonePath));
      }
      callback();
    }
  ];

  async.waterfall([

      function (callback) {
        async.waterfall(fullWar, callback);
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
        verbose: true,
        status: false
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
        _checkAndPromptForComboFlag(shifterJsonFile, shifterCfg, callback);
      } else {
        // no prompt. if comboFlag is set, use it,
        // otherwise, just start the build
        if (_.isBoolean(comboFlag)) {
          shifterCfg['replace-wf2_combine'] = comboFlag.toString();
          fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg, null, 2));
        }
        callback(null);
      }
    },
    function (callback) {
      // need to run npm install in the build directory if needed
      var buildPath = path.join(options.srcPath, '..', '..', 'build');
      utilities.installLocalNpmPackages(buildPath, callback);
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
        verbose: options.verbose,
        status: !options.silent
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
        verbose: options.verbose,
        status: !options.silent
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
            log.info('About to start a full ' + message + ' for branch \'' + branch + '\'');
            callback(null);
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
        verbose: true,
        status: false
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
        verbose: verbose,
        status: !silent
      }, function (err) {
        if (!err) {
          callback(null);
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      var cmdline = SHIFTER + ' --coverage false --lint false --csslint false';
      cmd.run(cmdline, {
        pwd: yuiDir,
        verbose: verbose,
        status: !silent
      }, function (err) {
        if (!err) {
          callback(null);
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      var cmdline = SHIFTER + ' --coverage false --lint false --csslint false';
      cmd.run(cmdline, {
        pwd: loaderDir,
        verbose: verbose,
        status: !silent
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

function _soy(verbose, silent, options, done) {
  gith.findGitRootPath({
    cwd: (options && options.cwd) ? options.cwd : cwd
  }, function (err, rootPath) {
    if (err) {
      // nothing we can do there...
      log.error('The current path cannot be built. Is it a wria2 path?');
      log.echo();
      done(-1);
    } else {
      var cmdline = 'node wf2_templates.js',
        buildPath = path.join(rootPath, 'build', 'lib');
      log.info('Building all Soy templates...');
      log.echo('Running: ' + cmdline);

      cmd.run(cmdline, {
        pwd: buildPath,
        status: false,
        verbose: true
      }, done);
    }
  });
}

function _server(verbose, silent, options, done) {
  utilities.getWF2srcPath({
    cwd: (options && options.cwd) ? options.cwd : cwd
  }, function (err, wf2srcPath) {
    if (err) {
      // nothing we can do there...
      log.error('The current path cannot be served. Is it a wria2 path?');
      log.echo();
      done(-1);
    } else {
      var name = servers[options.server].name,
        command = servers[options.server].command,
        args = servers[options.server].args;

      if (options && options.args) {
        args = options.args;
      }

      cmd.run(command + ' ' + args, {
        pwd: wf2srcPath,
        foreground: true,
        name: name
      }, done);
    }
  });
}

function _run(verbose, options, done) {
  // Depending on where the command is run, we are going to decide if we
  // have to run a full build, or just a single component build.
  var silent = false,
    promptOption,
    runType = TYPE_BUILD;

  if (!_.isUndefined(options.type)) {
    runType = options.type;
  } else {
    options.type = runType;
  }
  if (_.isUndefined(options.prompt)) {
    promptOption = true;
  } else {
    promptOption = options.prompt;
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
      if (options.type === TYPE_WAR) {
        // need to check for external dependencies first
        var result = utilities.isAppInstalled([{
          'name': 'mvn',
          'error': 'Couldn\'t find Maven... Please install it and try again'
        }, {
          'name': 'shifter',
          'error': 'Couldn\'t find Shifter... Please install it and try again'
        }, {
          'name': 'yogi',
          'error': 'Couldn\'t find Yogi... Please install it and try again'
        }, {
          'name': 'selleck',
          'error': 'Couldn\'t find Selleck... Please install it and try again'
        }, {
          'name': 'yuidoc',
          'error': 'Couldn\'t find YUIDoc... Please install it and try again'
        }]);

        if (!result) {
          callback(-1);
        } else {
          _war({
            username: options.username,
            wriaBranch: options.wriaBranch,
            yuiBranch: options.yuiBranch,
            type: options.type,
            verbose: verbose,
            silent: silent,
            pkgConfig: options.pkgConfig,
            prompt: _.isBoolean(promptOption) ? promptOption : true,
          }, callback);
        }
      } else if (options.type === TYPE_SERVER) {
        _server(verbose, silent, options, callback);
      } else if (options.type === TYPE_SOY) {
        _soy(verbose, silent, options, callback);
      } else {
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
    }
  ], function (err, data) {
    done(err, data);
  });
}

exports.run = _run;
