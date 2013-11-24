/*jshint node:true, unused:false*/

var async = require('async'),
  path = require('path'),
  fs = require('fs'),
  ncp = require('ncp').ncp,

  log = require('./logs'),
  cmd = require('./commands'),
  gith = require('./git-helper'),
  build = require('./wria2-build'),
  utilities = require('./utilities'),
  yui3Utils = require('./yui3-utils'),

  userChoices = {
    clone: 'false',
    cloneYui: 'true',
    path: '',
    yui3path: '',
    branch: '',
    url: '',
    build: 'true',
    combo: 'false'
  },
  SKIP_REPO_CLONING = 'skip-repo-cloning',
  cwd = process.cwd(),
  dstWf2srcPath,
  bootstrapped = false,
  srcHooksPath = path.join(__dirname, '..', 'data',
    'git-repo-bootstrap', 'git-hooks');


function _askForRepoPath(answer, callback) {
  if (answer) {
    // yes, user wants to clone
    userChoices.clone = 'true';
    //let's ask the next question: where?
    utilities.promptAndContinue({
      promptType: utilities.PROMPT_PROMPT,
      promptMsg: 'Please type an existing path where you want to clone, or ENTER to use the current path:',
      defaultValue: cwd,
      validator: function (value) {
        var pathForClone;
        value = utilities.resolvePath(value);
        pathForClone = path.resolve(value);
        if (!fs.existsSync(pathForClone)) {
          log.error('Invalid path: ', value);
          throw new Error();
        } else {
          return pathForClone;
        }
      }
    }, callback);
  } else {
    callback(SKIP_REPO_CLONING);
  }
}

function _checkForPathValidity(pathForClone, callback) {
  // Alright, user wants to clone into pathForClone
  // Let's make sure it's not a git repository...
  gith.isGitRepository({
    cwd: pathForClone
  }, function (err) {
    if (!err) {
      log.error('Invalid path, it is already a git repo... Please choose a bare path...');
      _askForRepoPath(true, function (err, repo) {
        _checkForPathValidity(repo, callback);
      });
    } else {
      // not a git repo but does the destination exist?
      var fullPath = path.join(pathForClone, userChoices.wria2gitname);
      if (!fs.existsSync(fullPath)) {
        callback(null, pathForClone);
      } else {
        log.error('Invalid path! \'' + fullPath + '\' already exists');
        _askForRepoPath(true, function (err, repo) {
          _checkForPathValidity(repo, callback);
        });
      }
    }
  });
}

function _gatherCloneRepoPath(done) {
  async.waterfall([

    function (callback) {
      utilities.promptAndContinue({
        promptType: utilities.PROMPT_CONFIRM,
        promptMsg: 'Do you want to clone the wria2 git repository locally? [Y|n]',
        defaultValue: true
      }, callback);
    },
    function (answer, callback) {
      _askForRepoPath(answer, callback);
    },
    function (pathForClone, callback) {
      _checkForPathValidity(pathForClone, callback);
    },
    function (pathForClone, callback) {
      userChoices.path = pathForClone;
      callback(null, pathForClone);
    }
  ], function (err, data) {
    done(err, data);
  });
}

function _askForExistingRepoPath(callback) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Please type an existing repository path, or ENTER to use the current path:',
    defaultValue: cwd,
    validator: function (value) {
      var pathForInit;
      value = utilities.resolvePath(value);
      pathForInit = path.resolve(value);
      if (!fs.existsSync(pathForInit)) {
        log.error('Invalid path: ', value);
        throw new Error();
      } else {
        return pathForInit;
      }
    }
  }, callback);
}

function _checkForRepoPathValidity(pathForInit, callback) {
  // Alright, user wants to clone into pathForClone
  // Let's make sure it's not a git repository...
  gith.isGitRepository({
    cwd: pathForInit
  }, function (err) {
    if (err) {
      log.error('Invalid path, it is not a git repo...');
      _askForExistingRepoPath(function (err, repo) {
        _checkForRepoPathValidity(repo, callback);
      });
    } else {
      // valid path, let's save it
      userChoices.path = pathForInit;
      callback(null, pathForInit);
    }
  });
}

function _gatherDefaultBranch(callback) {
  var msg = 'Please type the name of the branch you want to checkout,' +
    ' or ENTER to use the default';
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: msg + ' [' + userChoices
      .branch + ']:',
    defaultValue: userChoices.branch
  }, callback);
}

function _gatherUserChoices(done) {
  async.waterfall([

    function (callback) {
      _gatherCloneRepoPath(function (err, pathForClone) {
        if (err && err === SKIP_REPO_CLONING) {
          _askForExistingRepoPath(function (err, data) {
            if (!err) {
              _checkForRepoPathValidity(data, callback);
            } else {
              callback(-1);
            }
          });
        } else {
          // using clone
          callback(null, pathForClone);
        }
      });
    },
    function (arg, callback) {
      _gatherDefaultBranch(callback);
    },
    function (branch, callback) {
      if (branch) {
        userChoices.branch = branch;
      }
      callback(null);
    },
    function (callback) {
      yui3Utils.promptForCloneOrExisting(function (err, arg) {
        if (arg === 'E') {
          userChoices.cloneYui = 'false';
          yui3Utils.promptForYUIPath(callback);
        } else {
          callback(null, null);
        }
      });
    },
    function (yui3path, callback) {
      if (yui3path) {
        userChoices.yui3path = yui3path;
      }
      callback();
    },
    function (callback) {
      utilities.promptAndContinue({
        promptType: utilities.PROMPT_PROMPT,
        promptMsg: 'Do you want to start a full build once the repo is ready? [Y|n]',
        defaultValue: true
      }, function (err, value) {
        if (!err) {
          userChoices.build = (value) ? 'true' : 'false';
        }
        callback(err);
      });
    },
    function (callback) {
      if (userChoices.build === 'true') {
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: 'For the build, do you want to use the Combo Loader? [y|N]',
          defaultValue: false
        }, function (err, value) {
          if (!err && value) {
            userChoices.combo = 'true';
          }
          callback(err);
        });
      } else {
        callback();
      }
    }
  ], function (err) {
    done(err);
  });
}


function _cloneWria2(pkgConfig, done) {
  log.echo();
  gith.cloneGitRepository({
    url: userChoices.url,
    name: pkgConfig.wria2gitname,
    cwd: userChoices.path,
    silent: true,
    verbose: true
  }, function (err) {
    if (err) {
      log.fatal('Ooops something went wrong, sorry, cannot go any further!');
      done(1);
    } else {
      log.echo();
      log.success('Repository cloned successfully');
      userChoices.path = path.join(userChoices.path, pkgConfig.wria2gitname);
      done();
    }
  });
}

function _displayOptionsAndConfirmation(pkgConfig, callback) {
  log.echo();
  log.title('SUMMARY OF OPTIONS');
  log.echo();
  log.blue('Clone WRIA2 repo     : ', (userChoices.clone === 'false') ? 'no' : 'yes');
  log.blue('Clone YUI3 repo      : ', (userChoices.cloneYui === 'false') ? 'no' : 'yes');
  log.blue('Sync WRIA2 with YUI3 : yes');

  if (userChoices.cloneYui === 'true') {
    log.blue('YUI3 git url         : ', pkgConfig.wria2yui3giturl);
  } else {
    log.blue('YUI3 repository path : ', userChoices.yui3path);
  }

  if (userChoices.clone === 'true') {
    log.blue('WRIA2 git url        : ', userChoices.url);
    log.blue('Destination path     : ',
      path.join(userChoices.path, pkgConfig.wria2gitname));
  } else {
    log.blue('Existing WRIA2 path  : ', userChoices.path);
  }
  log.blue('Default branch       : ', userChoices.branch);
  log.blue('Start a build        : ', (userChoices.build === 'false') ? 'no' : 'yes');
  if (userChoices.build === 'true') {
    log.blue('Use Combo Loader     : ', (userChoices.combo === 'false') ? 'no' : 'yes');
  }
  log.echo();

  utilities.promptAndContinue({
    promptType: utilities.PROMPT_CONFIRM,
    promptMsg: 'Continue? [Y|n]',
    defaultValue: true
  }, callback);
}

function _checkForDependencies(callback) {
  var packages = ['selleck', 'yuidoc', 'shifter', 'yogi'];
  packages.forEach(function (name) {
    console.log('==> checking for :', name);
  });
  callback(1);
}

exports.run = function (verbose, pkgConfig, done) {
  userChoices.wria2gitname = pkgConfig.wria2gitname;
  userChoices.branch = pkgConfig.defaultBranch;

  async.waterfall([

      function (callback) {
        _checkForDependencies(callback);
      },
      function (callback) {
        _gatherUserChoices(function () {
          if (userChoices.path && userChoices.branch && userChoices.clone) {
            callback(null);
          } else {
            callback(1);
          }
        });
      },

      function (callback) {
        if (userChoices.clone === 'true') {
          userChoices.url = pkgConfig.wria2giturl;
          _displayOptionsAndConfirmation(pkgConfig, function (err, answer) {
            if (!err && answer) {
              _cloneWria2(pkgConfig, callback);
            } else {
              log.echo('Bye then...');
              callback(1);
            }
          });

          // utilities.promptAndContinue({
          //   promptMsg: 'Type the wria2 git url you want to clone,' + ' or type ENTER for default [' + pkgConfig
          //     .wria2giturl + ']',
          //   defaultValue: pkgConfig.wria2giturl,
          //   promptType: utilities.PROMPT_PROMPT,
          // }, function (err, value) {
          //   userChoices.url = value;
          //   _displayOptionsAndConfirmation(pkgConfig, function (err, answer) {
          //     if (!err && answer) {
          //       _cloneWria2(pkgConfig, callback);
          //     } else {
          //       log.echo('Bye then...');
          //       callback(1);
          //     }
          //   });
          // });

        } else {
          gith.findGitRootPath({
            cwd: userChoices.path,
          }, function (err, rootPath) {
            if (err) {
              log.error('Unable to find the root of the git repository! ');
              log.error(err);
              callback(err);
            } else {
              userChoices.path = rootPath;
              _displayOptionsAndConfirmation(pkgConfig, function (err, answer) {
                if (!err && answer) {
                  callback();
                } else {
                  log.echo('Bye then...');
                  callback(1);
                }
              });
            }
          });
        }
      },

      function (callback) {
        // need to go to the root of the git repo
        gith.findGitRootPath({
          cwd: userChoices.path,
        }, function (err, rootPath) {
          if (err) {
            log.error('Unable to find the root of the git repository! ');
            log.error(err);
            callback(err);
          } else {
            dstWf2srcPath = path.join(rootPath, 'wf2', 'src');
            callback(null, path.join(rootPath, '.git', 'hooks'));
          }
        });
      },
      function (dstHooksPath, callback) {
        // need to copy git-hooks to the correct location
        ncp(srcHooksPath, dstHooksPath, function (err) {
          if (err) {
            log.error(err);
            callback(err);
          } else {
            log.success('Git hooks copied successfully');
            callback(null, dstHooksPath);
          }
        });
      },
      function (dstHooksPath, callback) {
        // need to run npm install in the hooks directory
        cmd.run('npm install', {
          silent: false,
          inherit: false,
          pwd: dstHooksPath
        }, function (err) {
          if (err) {
            log.error('Unable to install npm packages in the hooks directory!');
            callback(err);
          } else {
            log.success('Git hooks dependencies successfully installed');
            callback(null);
          }
        });
      },
      function (callback) {
        // need to checkout the branch the user chose
        gith.checkoutBranch({
          cwd: userChoices.path,
          branch: userChoices.branch
        }, function (err) {
          if (!err) {
            log.success('Current branch is now ', userChoices.branch);
            callback();
          } else {
            callback(err);
          }
        });
      },
      function (callback) {
        if (userChoices.cloneYui === 'true') {
          // need to clone yui3
          log.echo();
          yui3Utils.cloneTemporayYui({
            url: pkgConfig.wria2yui3giturl
          }, function (err, data) {
            callback(null, data);
          });
        } else {
          callback(null, userChoices.yui3path);
        }
      },
      function (yui3path, callback) {
        gith.checkoutBranch({
          cwd: yui3path,
          branch: 'wf2-' + userChoices.branch
        }, function (err) {
          if (!err) {
            // need to fetch the latest code for yui if not cloned
            if (userChoices.cloneYui === 'false') {
              gith.gitFetchLatestFromOrigin({
                cwd: yui3path
              }, function (err) {
                callback(null, yui3path);
              });
            } else {
              callback(null, yui3path);
            }
          } else {
            callback(err);
          }
        });
      },
      function (yui3path, callback) {
        // copy the yui source files to wf2/src
        yui3Utils.copyYUItoWF2(yui3path, userChoices.path, callback);
      },
      function (callback) {
        bootstrapped = true;
        build.run(verbose, {
          cwd: dstWf2srcPath,
          combo: (userChoices.combo === 'true') ? true : false,
          prompt: false
        }, callback);
      }
    ],
    function (err, data) {
      if (bootstrapped) {
        log.echo();
        log.info('Your repository has been bootstrapped!');
      }
      if (userChoices.build) {
        if (!err) {
          log.info('And successfully built...');
        } else {
          log.info('But something went wrong with the build...');
          if (data) {
            console.log(data);
          }
        }
      }
      done();
    });
};
