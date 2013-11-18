/*jshint node:true, unused:false*/

var async = require('async'),
  path = require('path'),
  fs = require('fs'),
  ncp = require('ncp').ncp,
  prompt = require('promptly'),

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities'),

  userChoices = {
    clone: 'false',
    path: '',
    branch: 'dev-2.x',
    url: ''
  },
  PROMPT_CONFIRM = 'confirm',
  PROMPT_PROMPT = 'prompt',
  SKIP_REPO_CLONING = 'skip-repo-cloning',
  cwd = process.cwd(),
  srcHooksPath = path.join(__dirname, '..', 'data',
    'git-repo-bootstrap', 'git-hooks');


function _promptAndContinue(config, done) {
  if (config.infoMsg) {
    log.info(config.infoMsg);
    log.echo();
  }
  if (config.promptType === PROMPT_CONFIRM) {
    prompt.confirm(config.promptMsg, {
      'default': (config.defaultValue !== undefined) ? config.defaultValue : false
    }, done);
  } else if (config.promptType === PROMPT_PROMPT) {
    prompt.prompt(config.promptMsg, {
      'default': config.defaultValue,
      validator: config.validator
    }, done);
  }
}

function _askForRepoPath(answer, callback) {
  if (answer) {
    // yes, user wants to clone
    userChoices.clone = 'true';
    //let's ask the next question: where?
    _promptAndContinue({
      promptType: PROMPT_PROMPT,
      promptMsg: 'Please type an existing path where you want to clone, or ENTER to use the current path:',
      defaultValue: cwd,
      validator: function (value) {
        var pathForClone = path.resolve(value);
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
  utilities.isGitRepository({
    cwd: pathForClone
  }, function (err, data) {
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
      _promptAndContinue({
        promptType: PROMPT_CONFIRM,
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
  _promptAndContinue({
    promptType: PROMPT_PROMPT,
    promptMsg: 'Please type an existing repository path, or ENTER to use the current path:',
    defaultValue: cwd,
    validator: function (value) {
      var pathForInit = path.resolve(value);
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
  utilities.isGitRepository({
    cwd: pathForInit
  }, function (err, data) {
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
  _promptAndContinue({
    promptType: PROMPT_PROMPT,
    promptMsg: 'Please type the name of the branch you want to checkout, or ENTER to use the default one [master]:',
    defaultValue: 'master'
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
      callback(null, 'done');
    }
  ], function (err, data) {
    // data === 'done'
    // done(err, data);
    done(1);
  });
}


function _cloneWria2(pkgConfig, done) {
  log.echo();
  utilities.cloneGitRepository({
    url: userChoices.url,
    name: pkgConfig.wria2gitname,
    cwd: userChoices.path,
    silent: true,
    verbose: true
  }, function (err, data) {
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
  log.blue('Clone repository : ', (userChoices.clone === 'false') ? 'no' : 'yes');
  if (userChoices.clone === 'true') {
    log.blue('Wria2 git url    : ', userChoices.url);
    log.blue('Repository path  : ',
      path.join(userChoices.path, pkgConfig.wria2gitname));
  } else {
    log.blue('Repository path  : ', userChoices.path);
  }
  log.blue('Default branch   : ', userChoices.branch);
  log.echo();

  _promptAndContinue({
    promptType: PROMPT_CONFIRM,
    promptMsg: 'Continue? [Y|n]',
    defaultValue: true
  }, callback);
}

exports.run = function (verbose, pkgConfig, done) {
  userChoices.wria2gitname = pkgConfig.wria2gitname;

  async.waterfall([

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
          _promptAndContinue({
            promptMsg: 'Type the wria2 git url you want to clone,' +
              ' or type ENTER for default [' + pkgConfig.wria2giturl + ']',
            defaultValue: pkgConfig.wria2giturl,
            promptType: PROMPT_PROMPT,
          }, function (err, value) {
            userChoices.url = value;
            _displayOptionsAndConfirmation(pkgConfig, function (err, answer) {
              if (!err && answer) {
                _cloneWria2(pkgConfig, callback);
              } else {
                log.echo('Bye then...');
                callback(1);
              }
            });
          });
        } else {
          utilities.findGitRootPath({
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
        utilities.findGitRootPath({
          cwd: userChoices.path,
        }, function (err, rootPath) {
          if (err) {
            log.error('Unable to find the root of the git repository! ');
            log.error(err);
            callback(err);
          } else {
            callback(null, path.join(rootPath, '.git', 'hooks'));
          }
        });
      },
      function (dstHooksPath, callback) {
        // need to copy git-hooks to the correct location
        log.info('Bootstrapping your git repository...');
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
            callback(null);
          }
        });
      },
      function (callback) {
        // need to checkout the branch the user chose
        utilities.checkoutBranch({
          cwd: userChoices.path,
          branch: userChoices.branch
        }, function (err) {
          if (!err) {
            log.success('Current branch is now ', userChoices.branch);
          }
        });
      }
    ],
    function (err) {
      if (!err) {
        log.success('Git hooks dependencies successfully installed');
        log.info('Your repository has been bootstrapped!');
      }
      done();
    });
};
