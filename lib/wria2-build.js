/*jshint node:true*/

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
  moment = require('moment'),

  utilities = require('./utilities'),
  yui3Utils = require('./yui3-utils'),
  gith = require('./git-helper'),
  REMOTE_EXEC_RETURN_CODE = {
    ERROR: -2,
    SUCCESS: -125
  },
  TYPE_WAR = 'War',
  TYPE_WATCH = 'Watch',
  TYPE_BUILD = 'Build',
  TYPE_SOY = 'Soy',
  TYPE_SERVER = 'Server',
  TYPE_WAR_BUILD_REMOTE = 'j',
  TYPE_WAR_BUILD_LOCAL = 'l',
  REMOTE_ADD = 'a',
  REMOTE_REMOVE = 'r',
  REMOTE_STATUS = 's',
  JOB_TTL_MINUTES = 30,
  cwd = process.cwd(),
  tmpDir = utilities.getTemporaryDir(),
  runDir = path.join(tmpDir, 'run'),
  warJobQueueFile,
  SERVER_TYPE_SELLECK = 'selleck',
  SERVER_TYPE_YUIDOC = 'yuidoc',
  servers = {},
  tmpBuildDirName,
  userChoices = {
    remote: false,
    branch: '',
    yuiBranch: '',
    tmpClonePath: '',
    queueRequest: ''
  };

// cannot be initialized at declaration time since
// runtime dir may not exist...
warJobQueueFile = path.join(runDir, 'war-jobs.json');

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
        if (options.username && options.wriaBranch && options.yuiBranch && options.remote) {
          userChoices.username = options.username;
          userChoices.useremail = options.useremail;
          userChoices.branch = options.wriaBranch;
          userChoices.yuiBranch = options.yuiBranch;
          userChoices.wriaBranch = options.wriaBranch;
          userChoices.buildLocation = TYPE_WAR_BUILD_REMOTE;
          userChoices.remote = true;
          callback(-1);
        } else {
          callback();
        }
      },
      function (callback) {
        if (process.platform === 'win32') {
          log.notice('The WAR build will run directly on Jenkins');
          userChoices.buildLocation = TYPE_WAR_BUILD_REMOTE;
          callback();
        } else {
          if (!process.env.FEDTOOLS_PASSWORD) {
            log.notice('The WAR build will run directly on your machine');
            userChoices.buildLocation = TYPE_WAR_BUILD_LOCAL;
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
                    TYPE_WAR_BUILD_LOCAL + ']ocal or [' + TYPE_WAR_BUILD_REMOTE +
                    ']enkins...'
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
      },
      function (callback) {
        if (userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE) {
          var msg =
            'Do you want to [' + REMOTE_ADD + ']dd a job, [' + REMOTE_REMOVE +
            ']emove a job or check the jobs [' + REMOTE_STATUS + ']tatus?:';
          utilities.promptAndContinue({
            promptType: utilities.PROMPT_PROMPT,
            promptMsg: msg,
            validator: function (value) {
              value = value.toLowerCase();
              if (value !== REMOTE_ADD && value !== REMOTE_REMOVE && value !== REMOTE_STATUS) {
                log.error('Please choose [A]dd, [r]remove or [s]tatus...');
                throw new Error();
              } else {
                return value;
              }
            }
          }, function (err, value) {
            if (value) {
              userChoices.queueRequest = value;
            }
            callback();
          });
        } else {
          callback();
        }
      },
      function (callback) {
        if (userChoices.queueRequest === REMOTE_ADD) {
          var msg = 'Type your email (for WAR build completion notification):';
          utilities.promptAndContinue({
            promptType: utilities.PROMPT_PROMPT,
            promptMsg: msg,
          }, function (err, value) {
            if (value) {
              userChoices.useremail = value;
            }
            callback();
          });
        } else {
          callback();
        }
      },
      function (callback) {
        if (userChoices.queueRequest === REMOTE_ADD || userChoices.queueRequest ===
          REMOTE_REMOVE || userChoices.buildLocation === TYPE_WAR_BUILD_LOCAL) {
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
        } else {
          callback(null, '');
        }
      },
      function (msg, callback) {
        if (userChoices.queueRequest === REMOTE_ADD || userChoices.queueRequest ===
          REMOTE_REMOVE || userChoices.buildLocation === TYPE_WAR_BUILD_LOCAL) {
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
        } else {
          callback();
        }
      },
      function (callback) {
        if (userChoices.queueRequest === REMOTE_ADD || userChoices.queueRequest ===
          REMOTE_REMOVE || userChoices.buildLocation === TYPE_WAR_BUILD_LOCAL) {
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
        } else {
          callback();
        }
      },
      function (callback) {
        if (userChoices.queueRequest === REMOTE_ADD || userChoices.queueRequest ===
          REMOTE_REMOVE || userChoices.buildLocation === TYPE_WAR_BUILD_LOCAL) {
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
        } else {
          callback();
        }
      },
      function (callback) {
        if (userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE) {
          var msg = 'Type the password for user \'warbuilder\':';
          utilities.promptAndContinue({
            promptType: utilities.PROMPT_PASSWORD,
            promptMsg: msg,
            validator: function (value) {
              if (value === '') {
                throw new Error();
              } else {
                return value;
              }
            }
          }, function (err, value) {
            if (value) {
              userChoices.jenkinsuserpassword = value;
            }
            callback();
          });
        } else {
          callback();
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

function _displaySummaryAndConfirmation(done) {
  if (userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE && userChoices.queueRequest ===
    REMOTE_STATUS) {
    done(null, true);
  } else {
    log.echo();
    log.title('SUMMARY OF OPTIONS');
    log.echo();

    log.blue('Username                  : ', userChoices.username);
    log.blue('WF-RIA2 branch            : ', userChoices.branch);
    log.blue('YUI3 branch               : ', userChoices.yuiBranch);
    if (userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE) {
      if (userChoices.queueRequest === REMOTE_ADD) {
        log.blue('Build location            : ', 'remote');
        log.blue('Estimated completion time : ', 'about 25 minutes');
      }
      if (userChoices.queueRequest === REMOTE_REMOVE) {
        log.blue('Scheduled job removal     : ', 'yes');
      }
    } else {
      log.blue('Build location            : ', 'local');
      log.blue('Estimated completion time : ', 'about 10 minutes');
    }

    log.echo();
    if (userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE && userChoices.queueRequest ===
      REMOTE_ADD) {
      log.notice('Be a good citizen, don\'t run this remote build too often!');
      log.echo();
    }
    utilities.promptAndContinue({
      promptType: utilities.PROMPT_CONFIRM,
      promptMsg: 'Continue? [Y|n]',
      defaultValue: true
    }, done);
  }
}

function _removeJobFromQueueFile(options, dontCheckIfAlive) {
  var jobs, job, index;
  if (fs.existsSync(warJobQueueFile)) {
    jobs = JSON.parse(fs.readFileSync(warJobQueueFile, 'utf8'));

    job = _.find(jobs, function (obj, key) {
      if (obj.username === options.username &&
        obj.wriaBranch === options.wriaBranch) {
        index = key;
        return true;
      }
    });

    if (job) {
      if (!dontCheckIfAlive && job.pid) {
        // check if it's still running...
        // if not remove the entry from the queue
        if (utilities.sendSignal(job.pid, utilities.ALIVE_SIGNAL)) {
          // kill it!
          utilities.sendSignal(job.pid, utilities.KILL_SIGNAL);
          jobs.splice(index, 1);
          fs.writeFileSync(warJobQueueFile, JSON.stringify(jobs, null, 2));
        } else {
          // not alive, just removing the job from the file
          jobs.splice(index, 1);
          fs.writeFileSync(warJobQueueFile, JSON.stringify(jobs, null, 2));
        }
      } else {
        if (jobs[index]) {
          jobs.splice(index, 1);
          fs.writeFileSync(warJobQueueFile, JSON.stringify(jobs, null, 2));
        } else {
          log.notice('Job does not exist...');
        }
      }
    }
  }
}

function _war(options, done) {
  var shifterCfg,
    comboFlag = true,
    pkgConfig = options.pkgConfig,
    fullWar = [],
    now = new Date(),
    srcWar;

  fullWar = [

    function (callback) {
      _gatherUserChoicesForWar(options, callback);
    },
    function (callback) {
      if (userChoices.remote || userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE) {
        // need to update the queue file to lock this build
        if (options.jobs) {
          options.jobs[0].startTime = now;
          options.jobs[0].estimatedEndTime = moment(now).add('minutes', 25);
          options.jobs[0].pid = process.pid;
          fs.writeFileSync(warJobQueueFile, JSON.stringify(options.jobs, null, 2));
        }
        callback();
      } else {
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
          callback();
        }
      }
    },
    function (callback) {
      if (userChoices.remote) {
        callback();
      } else {
        _displaySummaryAndConfirmation(function (err, value) {
          if (!value) {
            log.echo('Bye then...');
            log.echo();
            callback(-1);
          } else {
            callback();
          }
        });
      }
    },
    function (callback) {
      var res, cmdline, cmdlineTpl = 'source ~/.bash_profile; ' +
          'fedtools war -r -u {{username}} -e {{useremail}} -w {{wriaBranch}} -y {{yuiBranch}} {{queueRequest}}';

      if (userChoices.remote) {
        callback();
      } else {
        if (userChoices.buildLocation === TYPE_WAR_BUILD_REMOTE) {
          cmdline = mustache.render(cmdlineTpl, {
            queueRequest: (userChoices.queueRequest) ? '-' + userChoices.queueRequest.toUpperCase() : '',
            jenkinsusername: pkgConfig.jenkinsusername,
            jenkinshostname: pkgConfig.jenkinshostname,
            username: userChoices.username,
            useremail: userChoices.useremail,
            wriaBranch: userChoices.branch,
            yuiBranch: userChoices.yuiBranch
          });

          log.echo();
          if (userChoices.queueRequest === REMOTE_STATUS) {
            log.info('Getting jobs queue information...');
          } else if (userChoices.queueRequest === REMOTE_ADD) {
            log.info('Scheduling a WAR build for ' +
              userChoices.username + ' on Jenkins server...');
          } else if (userChoices.queueRequest === REMOTE_REMOVE) {
            log.notice('Removing a previously scheduled job...');
          }

          res = cmd.runRemote(cmdline, {
            username: pkgConfig.jenkinsusername,
            host: pkgConfig.jenkinshostname,
            password: userChoices.jenkinsuserpassword
          }, function (err, code) {
            if (code !== 0) {
              log.error('There was a problem with the build');
              callback(-1);
            } else {
              // we're done here but we need to bypass the rest
              // so one way is to return an error that can be trapped
              // and interpreted as success for remote execution...
              callback(REMOTE_EXEC_RETURN_CODE.SUCCESS);
            }
          });
        } else {
          callback();
        }
      }
    },
    function (callback) {
      // setting up the temporary build folder
      // making it unique to the user
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
      var war, dstWar, htmlBodytpl;

      war = 'custom-' + userChoices.branch + '-' + userChoices.username + '.war';
      srcWar = path.join(userChoices.tmpClonePath,
        'wt2', 'wria2-documentation', 'target', war);
      dstWar = path.join(process.cwd(), war);


      if (userChoices.remote) {
        // removing job from queue file
        _removeJobFromQueueFile(userChoices, true);
        // we are remote, so just need to say all went well
        log.info('Remote job is done! Sending email...');

        htmlBodytpl = fs.readFileSync(path.join(__dirname, '..', 'data', 'templates', 'war',
          'jobcomplete.mustache'), 'utf8');

        utilities.sendEmail({
          to: userChoices.useremail,
          subject: 'WAR remote build [ COMPLETE ]',
          htmlBody: mustache.render(htmlBodytpl, {
            username: userChoices.username,
            wriaBranch: userChoices.wriaBranch,
            yuiBranch: userChoices.yuiBranch,
            war: war,
            srcWar: path.join(process.env.HOME, war),
            jenkinsusername: pkgConfig.jenkinsusername,
            jenkinshostname: pkgConfig.jenkinshostname
          })
        }, callback);
      } else if (fs.existsSync(srcWar)) {
        // file was not moved, let's do it
        fs.renameSync(srcWar, dstWar);
        log.success('WAR file built successfully!');
        log.echo();
        log.echo('WAR file name  : ', war);
        log.echo('WAR local path : ' + process.cwd());
        log.echo();
        log.notice('You may want to remove the cloned temp repos: ');
        log.echo(path.resolve(userChoices.tmpClonePath));
        log.echo(path.resolve(yui3path));
        callback();
      } else if (fs.existsSync(dstWar)) {
        log.success('WAR file built successfully!');
        log.echo();
        log.echo('WAR file name  : ', war);
        log.echo('WAR local path : ' + process.cwd());
        log.echo();
        log.notice('You may want to remove the cloned temp repos: ');
        log.echo(path.resolve(userChoices.tmpClonePath));
        log.echo(path.resolve(yui3path));
        callback();
      } else {
        log.warning('Oops, cannot find the WAR file...');
        log.warning('You may want to run the build yourself?');
        log.warning('The temporary clone folder is:');
        log.echo(path.resolve(userChoices.tmpClonePath));
        callback(127);
      }
    }
  ];

  async.waterfall([

      function (callback) {
        async.waterfall(fullWar, callback);
      }
    ],
    function (err, data) {
      if (err === REMOTE_EXEC_RETURN_CODE.SUCCESS) {
        if (userChoices.queueRequest === 'a') {
          log.success('The WAR job has been successfully scheduled');
          log.info('You will receive an email once terminated');
        }
      } else {
        done(err, data);
      }
    }
  );
}

function _addJobToQueueFile(file, jobs, options) {
  var htmlBodytpl, now = new Date(),
    len = jobs.length,
    msg;
  jobs.push({
    username: options.username,
    useremail: options.useremail,
    wriaBranch: options.wriaBranch,
    yuiBranch: options.yuiBranch,
    queueTime: now
  });
  fs.writeFileSync(warJobQueueFile, JSON.stringify(jobs, null, 2));

  if (len === 0) {
    msg = 'Your job is the first in the queue! ';
  } else if (len === 1) {
    msg = 'There is ' + len +
      ' scheduled job before yours. ';
  } else if (len > 1) {
    msg = 'There are ' + len +
      ' scheduled jobs before yours. ';
  }

  msg = msg + 'It means that your job should be done in about ' +
    parseInt(JOB_TTL_MINUTES * (len + 1), 10) +
    ' minutes depending on the load on the Jenkins server...';

  htmlBodytpl = fs.readFileSync(path.join(__dirname, '..', 'data', 'templates', 'war',
    'addjobtoqueue.mustache'), 'utf8');

  utilities.sendEmail({
    to: options.useremail,
    subject: 'WAR remote build [ SCHEDULED ]',
    htmlBody: mustache.render(htmlBodytpl, {
      username: options.username,
      wriaBranch: options.wriaBranch,
      yuiBranch: options.yuiBranch,
      msg: msg
    })
  }, function () {});
}

function _processWarOptions(options, done) {
  var res, index, job, htmlBodytpl, jobs = [];

  if (options.remote && options.processJob) {
    if (fs.existsSync(warJobQueueFile)) {
      jobs = JSON.parse(fs.readFileSync(warJobQueueFile, 'utf8'));

      job = _.find(jobs, function (obj, key) {
        if (obj.pid) {
          index = key;
          return true;
        }
      });

      if (job) {
        // check if it's still running...
        // if not remove the entry from the queue
        if (utilities.sendSignal(job.pid, utilities.ALIVE_SIGNAL)) {
          // need to check if it's too old
          // if it is, kill it!
          if (moment(job.startTime).add('minutes', JOB_TTL_MINUTES) - moment() < 0) {
            // job is too old, killing it
            utilities.sendSignal(job.pid, utilities.KILL_SIGNAL);
            // not cleaning the queue file to give the process time to stop
            // cleanly. it will be removed next time.
            done();
          } else {
            done();
          }
        } else {
          // not alive, removing from the queue
          jobs.splice(index, 1);
          fs.writeFileSync(warJobQueueFile, JSON.stringify(jobs, null, 2));
          done();
        }
      } else {
        job = _.find(jobs, function (obj, key) {
          if (!obj.pid) {
            index = key;
            return true;
          }
        });
        if (job) {
          // need to run this job
          htmlBodytpl = fs.readFileSync(path.join(__dirname, '..', 'data', 'templates', 'war',
            'jobstarted.mustache'), 'utf8');

          utilities.sendEmail({
            to: job.useremail,
            subject: 'WAR remote build [ STARTED ]',
            htmlBody: mustache.render(htmlBodytpl, {
              username: job.username,
              wriaBranch: job.wriaBranch,
              yuiBranch: job.yuiBranch
            })
          }, function () {
            _war(_.extend(options, {
              username: job.username,
              useremail: job.useremail,
              wriaBranch: job.wriaBranch,
              yuiBranch: job.yuiBranch,
              jobs: jobs,
              verbose: false,
              prompt: false,
              silent: true
            }), done);
          });

        } else {
          done();
        }
      }
    }
  } else if (options.remote && options.addJob) {
    mkdirp.sync(runDir);
    if (fs.existsSync(warJobQueueFile)) {
      jobs = JSON.parse(fs.readFileSync(warJobQueueFile, 'utf8'));
      res = _.find(jobs, function (obj) {
        if (obj.username === options.username &&
          obj.wriaBranch === options.wriaBranch) {
          return true;
        }
      });

      if (!res) {
        _addJobToQueueFile(warJobQueueFile, jobs, options);
        done();
      } else {
        log.notice('The same job already exists!');
        done();
      }
    } else {
      _addJobToQueueFile(warJobQueueFile, jobs, options);
      done();
    }
  } else if (options.remote && options.removeJob) {
    _removeJobFromQueueFile(options, false);
    done();
  } else if (options.remote && options.statusJob) {
    if (fs.existsSync(warJobQueueFile)) {
      jobs = JSON.parse(fs.readFileSync(warJobQueueFile, 'utf8'));
      if (jobs.length > 0) {
        jobs.forEach(function (job, index) {
          log.echo();
          log.echo('Job #' + index);
          log.echo(' User fork                 : ', job.username);
          log.echo(' WF-RIA branch             : ', job.wriaBranch);
          log.echo(' YUI branch                : ', job.yuiBranch);
          log.echo(' Added in queue            : ', moment(job.queueTime).fromNow());
          log.echo(' Currently running         : ', job.pid ? 'yes' : 'no');
          if (job.startTime) {
            log.echo(' Build start time          : ', moment(job.startTime).format(
              'MMM Do YYYY, h:mm:ss a'));
            log.echo(' Estimated completion time : ', moment(job.startTime).add('minutes',
                JOB_TTL_MINUTES - 5)
              .fromNow());
          }
        });
      } else {
        log.echo('There are no jobs scheduled to run remotely...');
      }
      log.echo();
      done();
    } else {
      log.echo('There are no jobs scheduled to run remotely...');
      log.echo();
      done();
    }
  } else if (!options.remote) {
    _war(options, done);
  }
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
        _processWarOptions(_.extend(options, {
          verbose: verbose,
          silent: silent,
          pkgConfig: options.pkgConfig,
          prompt: _.isBoolean(promptOption) ? promptOption : true
        }), callback);

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
