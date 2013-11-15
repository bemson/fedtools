/*jshint node:true*/

var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  prompt = require('promptly'),

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities');


exports.full = function (verbose, done) {
  var silent = false,
    shifterCfg;

  if (process.platform === 'win32') {
    verbose = true;
    silent = true;
  }

  async.waterfall([
      function (callback) {
        // need to make sure we are located in a git repository
        utilities.isGitRepository(function (err) {
          if (err) {
            log.error('The current directory is not a git repository...');
            callback(err);
          } else {
            // need to get the root of the git repo, and from there the src path
            utilities.findGitRootPath(function (err, rootPath) {
              if (err) {
                log.error('Unable to find the root of the git repository! ');
                log.error(err);
                callback(err);
              } else {
                callback(null, path.join(rootPath.toString().replace(/\n$/, ''),
                  'wf2', 'src'));
              }
            });
          }
        });
      },
      function (srcPath, callback) {
        utilities.getCurrentBranch(function (err, branch) {
          if (err) {
            log.error('Unable to find the current branch of the git repository!');
            log.error(err);
            callback(err);
          } else {
            log.info('About to start a full build of branch ' + branch);
            log.echo();
            prompt.confirm('Continue? [Y|n]', {
                'default': true
              },
              function (err, answer) {
                if (!answer) {
                  log.echo('Bye then!');
                  callback(-1);
                } else {
                  callback(null, srcPath);
                }
              }
            );
          }
        });
      },
      function (srcPath, callback) {
        var yuiFile = srcPath + '/yui/js/yui.js';

        if (!fs.existsSync(yuiFile)) {
          log.error('Ooops! It looks like you\'re missing key YUI3 source files!');
          callback(-1);
        } else {
          callback(null, srcPath);
        }
      },
      function (srcPath, callback) {
        var shifterJsonFile = srcPath + '/.shifter.json';

        if (!fs.existsSync(shifterJsonFile)) {
          log.error('Ooops! It looks like you\'re missing a .shifter.json configuration file!');
          callback(-1);
        } else {
          callback(null, srcPath, shifterJsonFile);
        }
      },
      function (srcPath, shifterJsonFile, callback) {
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
                callback(null, srcPath);
              }
            }
          );
        } else {
          callback(null, srcPath);
        }
      },
      function (srcPath, callback) {
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
              callback(null, srcPath);
            }
          });
        } else {
          callback(null, srcPath);
        }
      },
      function (srcPath, callback) {
        var cmdline = 'rm -rf ' + path.join(srcPath, '..', 'build');
        cmd.run(cmdline, null, function (err) {
          if (!err) {
            callback(null, srcPath);
          } else {
            callback(err);
          }
        });
      },
      function (srcPath, callback) {
        var baseCSStmplPath = path.join(srcPath, 'wt2-base-css', 'templates'),
          cmdline = 'mkdir -p ' + baseCSStmplPath;
        if (!fs.existsSync(baseCSStmplPath)) {
          cmd.run(cmdline, null, function (err) {
            if (!err) {
              callback(null, srcPath);
            } else {
              callback(err);
            }
          });
        } else {
          callback(null, srcPath);
        }
      },
      function (srcPath, callback) {
        var buildPath = path.join(srcPath, '..', '..', 'build', 'lib'),
          cmdline = 'node wf2_prebuild_loader_dependencies.js';
        cmd.run(cmdline, {
          pwd: buildPath,
          inherit: verbose,
          silent: silent
        }, function (err) {
          if (!err) {
            callback(null, srcPath);
          } else {
            callback(err);
          }
        });
      },
      function (srcPath, callback) {
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
};

exports.solo = function (verbose, done) {
  var cwd = process.cwd(),
    silent = false,
    buildJsonFile = cwd + '/build.json',
    metaDir = cwd + '/meta',
    yuiDir = path.join(cwd, '/../yui'),
    loaderDir = path.join(cwd, '/../loader');

  if (process.platform === 'win32') {
    verbose = true;
    silent = true;
  }

  async.waterfall([
      function (callback) {
        if (!fs.existsSync(buildJsonFile) || !fs.existsSync(metaDir)) {
          log.error('Ooops! The current path is not a single component path...');
          callback(-1);
        } else {
          callback(null);
        }
      },
      function (callback) {
        if (!fs.existsSync(yuiDir) || !fs.existsSync(loaderDir)) {
          log.error('Ooops! Cannot resolve YUI/loader path...');
          callback(-1);
        } else {
          callback(null);
        }
      },
      function (callback) {
        var cmdline = 'shifter';
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
};
