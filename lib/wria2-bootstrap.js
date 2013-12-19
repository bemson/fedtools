/*jshint node:true, unused:false*/

var async = require('async'),
  path = require('path'),
  fs = require('fs'),
  ncp = require('ncp').ncp,
  mustache = require('mustache'),
  log = require('fedtools-logs'),
  cmd = require('fedtools-commands'),

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
    yuiBranch: '',
    url: '',
    build: 'true',
    combo: 'false',
    gitlabId: ''
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
      promptMsg: 'Type an existing path where you want to clone, or ENTER to use the current path:',
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
    promptMsg: 'Type an existing repository path, or ENTER to use the current path:',
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

function _gatherWria2Branch(callback) {
  var msg = 'Type the name of the WFRIA2 branch you need,' +
    ' or ENTER to use the default';
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: msg + ' [' + userChoices
      .branch + ']:',
    defaultValue: userChoices.branch
  }, callback);
}

function _gatherYuiBranch(pkgConfig, callback) {
  var msg = 'Type the name of the YUI3 branch you need,' +
    ' or ENTER to use the default';
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: msg + ' [' + userChoices.yuiBranch + ']:',
    defaultValue: userChoices.yuiBranch
  }, callback);
}

function _gatherGitlabId(pkgConfig, callback) {
  var msg = 'Type the name of your Gitlab fork (usually your username):';
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: msg,
  }, function (err, value) {
    if (value) {
      userChoices.gitlabId = value;
      userChoices.url = mustache.render(pkgConfig.wria2giturl, {
        gitlabId: value
      });
    }
    callback(null);
  });
}

function _gatherUserChoices(pkgConfig, done) {
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
      _gatherGitlabId(pkgConfig, callback);
    },
    function (callback) {
      _gatherWria2Branch(function (err, branch) {
        if (!err && branch) {
          userChoices.branch = branch;
        }
        callback(err);
      });
    },
    function (callback) {
      userChoices.yuiBranch = 'wf2-' + pkgConfig.defaultBranch;
      _gatherYuiBranch(pkgConfig, function (err, branch) {
        if (!err && branch) {
          userChoices.yuiBranch = branch;
        }
        callback(err);
      });
    },
    function (callback) {
      yui3Utils.promptForCloneOrExisting(function (err, arg) {
        if (arg === yui3Utils.YUI3_EXISTING) {
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
        promptType: utilities.PROMPT_CONFIRM,
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
          promptType: utilities.PROMPT_CONFIRM,
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
  log.blue('WRIA2 branch         : ', userChoices.branch);
  log.blue('YUI3 branch          : ', userChoices.yuiBranch);
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

exports.run = function (verbose, pkgConfig, done) {
  userChoices.wria2gitname = pkgConfig.wria2gitname;
  userChoices.branch = pkgConfig.defaultBranch;

  async.waterfall([

      function (callback) {
        _gatherUserChoices(pkgConfig, function () {
          if (userChoices.path && userChoices.branch && userChoices.clone) {
            callback(null);
          } else {
            callback(1);
          }
        });
      },
      function (callback) {
        if (userChoices.clone === 'true') {
          _displayOptionsAndConfirmation(pkgConfig, function (err, answer) {
            if (!err && answer) {
              _cloneWria2(pkgConfig, callback);
            } else {
              log.echo('Bye then...');
              callback(-1);
            }
          });
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
                  callback(-1);
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
          status: true,
          verbose: false,
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
        var upstreamUrl = mustache.render(pkgConfig.wria2giturl, {
          gitlabId: pkgConfig.defaultGitlabId
        });
        if (userChoices.gitlabId !== pkgConfig.defaultGitlabId) {
          // need to add upstream remote
          // git remote add upstream upstreamUrl
          gith.gitAddUpstreamRemote({
            cwd: dstWf2srcPath,
            url: upstreamUrl
          }, function (err, data) {
            if (!err) {
              log.success('Adding remote pointing to upstream...');
            }
            callback();
          });
        } else {
          // even if this failed, let's still continue
          log.warning('Unable to set the remote to upstream!');
          callback();
        }
      },
      function (callback) {
        if (userChoices.cloneYui === 'true') {
          // need to do a shallow clone of yui3
          log.echo();
          yui3Utils.cloneTemporaryYui({
            branch: userChoices.yuiBranch,
            url: pkgConfig.wria2yui3giturl
          }, function (err, data) {
            callback(null, data);
          });
        } else {
          callback(null, userChoices.yui3path);
        }
      },
      function (yui3path, callback) {
        // copy the yui source files to wf2/src
        yui3Utils.copyYUItoWF2(yui3path, userChoices.path, callback);
      },
      function (callback) {
        bootstrapped = true;
        if (userChoices.build === 'true') {
          build.run(verbose, {
            cwd: dstWf2srcPath,
            combo: (userChoices.combo === 'true') ? true : false,
            prompt: false
          }, callback);
        } else {
          // user doesn't want to build but we can still bootstrap
          // the build npm packages dependencies
          var buildPath = path.join(dstWf2srcPath, '..', '..', 'build');
          utilities.installLocalNpmPackages(buildPath, callback);
        }
      }
    ],
    function (err, data) {
      var srcPath;

      if (bootstrapped) {
        log.echo();
        log.info('Your repository has been bootstrapped!');

        if (userChoices.build === 'true') {
          if (!err) {
            log.info('And successfully built!');
            log.echo();
            log.echo(
              'You can start Selleck to view example pages with the following commands:');

            srcPath = (process.platform !== 'win32') ? dstWf2srcPath : dstWf2srcPath.replace(
              /\\/g, '/');

            log.echo(' cd ' + srcPath);
            log.echo(' selleck -s -p wf2-common/docs');
          } else {
            log.info('But something went wrong with the build :(');
            log.echo(err);
            if (data) {
              console.log(data);
            }
          }
        }
      } else {
        if (err && err !== -1) {
          log.fatal('Something went wrong... cannot go any further!');
          log.echo(err);
          if (data) {
            log.echo(data);
          }
        }
      }
      done();
    });
};
