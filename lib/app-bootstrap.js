/*jshint node:true, unused:true*/

var _ = require('underscore'),
  path = require('path'),
  fs = require('fs'),
  mustache = require('mustache'),
  glob = require('glob'),
  mkdirp = require('mkdirp'),
  async = require('async'),
  cmd = require('fedtools-commands'),
  log = require('fedtools-logs'),

  utilities = require('./utilities'),

  pagesName = [],
  defaultAppName = 'webapp',
  defaultAppVersion = '1.0.0',
  defaultTagsVersion = '2.1.0sp1',
  userChoices = {
    flowName: '',
    totalPagesForFlow: 1,
    customPagesName: false,

    moduleName: '', // wf2-extended-menu
    baseName: '', // wf2ExtendedMenu
    className: '', // ExtendedMenu
    namespace: 'WF2',
    moduleType: 'widget',
    moduleExtends: 'Y.Widget',
    overwrite: false,
    wt2module: true
  },
  cwd = process.cwd(),
  tplRootDir = path.join(__dirname, '..', 'data', 'templates', 'webapp'),
  tplExtension = '.webapp.mustache',
  tplFileName = 'TPL-FLOW-NAME',
  TYPE_APP = 'full',
  TYPE_MOD = 'webapp-mod',
  TYPE_FLOW = 'flow';

exports.TYPE_APP = TYPE_APP;
exports.TYPE_MOD = TYPE_MOD;
exports.TYPE_FLOW = TYPE_FLOW;

function _askForDestinationPath(callback) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Please type a destination path, or ENTER to use the current path:',
    defaultValue: cwd,
    validator: function (value) {
      var pathForNewSkeleton;
      value = utilities.resolvePath(value);
      pathForNewSkeleton = path.resolve(value);
      if (!fs.existsSync(pathForNewSkeleton)) {
        log.error('Invalid path: ', value);
        throw new Error();
      } else {
        return pathForNewSkeleton;
      }
    }
  }, callback);
}

function _getFinalName(filename, realName) {
  var re = new RegExp(tplFileName, 'g');
  return filename.replace(tplExtension, '').replace(re, realName);
}

function _buildFiles(type, dstPath, done) {
  var files, dotFiles, tpl, buffer, realName,
    rootPath, pkgFile, pkgConfig, tmpFlows,
    tplDir = path.join(tplRootDir, type);

  files = glob.sync(tplDir + '/**/*' + tplExtension);
  dotFiles = glob.sync(tplDir + '/**/.*' + tplExtension);
  if (type === TYPE_APP) {
    realName = userChoices.appName;
    dstPath = path.join(dstPath, userChoices.appName);
    rootPath = dstPath;
  }

  if (type === TYPE_FLOW) {
    realName = userChoices.flowName;
    rootPath = dstPath;
  }

  files.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), realName);
    tpl = fs.readFileSync(file, 'utf8');
    buffer = mustache.render(tpl, {
      FLOWNAME: '{{FLOWNAME}}',
      flowName: userChoices.flowName,
      appName: userChoices.appName,
      appVersion: userChoices.appVersion,
      wt2Version: userChoices.wt2Version,
      className: userChoices.className,
      baseName: userChoices.baseName,
      namespace: userChoices.namespace,
      moduleExtends: userChoices.moduleExtends,
    });
    if (buffer) {
      mkdirp.sync(path.join(dstPath, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, destFileName), buffer);
      buffer = null;
    }
  });

  dotFiles.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), realName);
    tpl = fs.readFileSync(file, 'utf8');
    buffer = mustache.render(tpl, {
      flowName: userChoices.flowName,
      appName: userChoices.appName,
      appVersion: userChoices.appVersion,
      wt2Version: userChoices.wt2Version,
      className: userChoices.className,
      baseName: userChoices.baseName,
      namespace: userChoices.namespace,
      moduleExtends: userChoices.moduleExtends,
    });

    if (buffer) {
      mkdirp.sync(path.join(dstPath, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, destFileName), buffer);
      buffer = null;
    }
  });

  if (type === TYPE_FLOW) {
    // For flows, need to update package.json to add the new flow
    pkgFile = path.join(dstPath, 'package.json');
    pkgConfig = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));

    if (pkgConfig.flows) {
      tmpFlows = pkgConfig.flows;
      tmpFlows.push(userChoices.flowName);
      pkgConfig.flows = _.uniq(tmpFlows);
    } else {
      pkgConfig.flows = [userChoices.flowName];
    }
    fs.writeFileSync(pkgFile, JSON.stringify(pkgConfig, null, 2));
  }

  done(null);
}

function _gatherUserChoices(type, done) {

  if (type === TYPE_FLOW) {
    async.waterfall([

      function (callback) {
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: 'Type your webapp\'s root path, or ENTER to use the current path:',
          defaultValue: cwd,
          validator: function (value) {
            var rootPath;
            value = utilities.resolvePath(value);
            rootPath = path.resolve(value);
            if (!fs.existsSync(rootPath) || !fs.existsSync(path.join(rootPath, 'src',
              'main', 'webapp'))) {
              log.error('Invalid path: ', value);
              throw new Error();
            } else {
              return rootPath;
            }
          }
        }, function (err, value) {
          userChoices.rootPath = value;
          callback();
        });
      },
      function (callback) {
        var msg = 'Type the name of the flow you want to generate:';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
          validator: function (value) {
            var flowJSPath = path.join(userChoices.rootPath,
              'src', 'main', 'js', 'flows', value);
            if (fs.existsSync(flowJSPath)) {
              log.error('Flow name already taken... (' + value + ')');
              throw new Error();
            } else {
              return value;
            }
          }
        }, function (err, value) {
          if (value) {
            userChoices.flowName = value;
          }
          callback();
        });
      },
      function (callback) {
        var msg = 'How many pages? (you can add more later):';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
        }, function (err, value) {
          if (value) {
            userChoices.totalPagesForFlow = parseInt(value, 10);
          }
          callback();
        });
      },
      function (callback) {
        var msg = 'Do you want to manually name these pages? [y|N]';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_CONFIRM,
          promptMsg: msg,
          defaultValue: false
        }, function (err, value) {
          userChoices.customPagesName = value;
          callback();
        });
      },
      function (callback) {
        if (userChoices.customPagesName) {
          log.echo('Need to ask for the name of all pages...');
        } else {
          var i, total = userChoices.totalPagesForFlow + 1;
          for (i = 1; i < total; i += 1) {
            pagesName.push('page' + i);
          }
          callback();
        }
      }
    ], function (err) {
      done(err);
    });
  } else if (type === TYPE_APP) {
    async.waterfall([

      function (callback) {
        _askForDestinationPath(function (err, data) {
          if (!err) {
            userChoices.rootPath = data;
            callback();
          } else {
            callback(-1);
          }
        });
      },
      function (callback) {
        var msg = 'Type the name of the app, or ENTER for default [' +
          defaultAppName + ']:';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
          defaultValue: defaultAppName,
          validator: function (value) {
            var fullPath = path.join(userChoices.rootPath, value);
            if (fs.existsSync(fullPath)) {
              log.error('App name already taken... (' + value + ')');
              throw new Error();
            } else {
              return value;
            }
          }
        }, function (err, value) {
          if (value) {
            userChoices.appName = value;
          }
          callback();
        });
      },
      function (callback) {
        var msg = 'Type the version of the app, or ENTER for default [' +
          defaultAppVersion + ']:';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
          defaultValue: defaultAppVersion
        }, function (err, value) {
          if (value) {
            userChoices.appVersion = value;
          }
          callback();
        });
      },
      function (callback) {
        var msg = 'Type the WF-RIA2 tags version to use, or ENTER for default [' +
          defaultTagsVersion + ']';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_PROMPT,
          promptMsg: msg,
          defaultValue: defaultTagsVersion
        }, function (err, value) {
          if (value) {
            userChoices.wt2Version = value;
          }
          callback();
        });
      },
      function (callback) {
        var msg = 'Do you want to bootstrap local NPM packages? [Y|n]';
        utilities.promptAndContinue({
          promptType: utilities.PROMPT_CONFIRM,
          promptMsg: msg,
          defaultValue: true
        }, function (err, value) {
          userChoices.installNpmPackages = value;
          callback();
        });
      }
    ], function (err) {
      done(err);
    });
  }
}

function _extractAppInformation(appPath, done) {
  // trying to extract appName and appVersion from package file
  var packageFileJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));
  done(null, packageFileJson.name, packageFileJson.version);
}

function _displaySummaryAndConfirmation(type, done) {
  log.echo();
  log.title('SUMMARY OF OPTIONS');
  log.echo();

  if (type === TYPE_APP) {
    log.blue('Application name    : ', userChoices.appName);
    log.blue('Application version : ', userChoices.appVersion);
    log.blue('Application path    : ', path.join(userChoices.rootPath, userChoices.appName));
    log.blue('WF-RIA tags version : ', userChoices.wt2Version);
    log.blue('Bootstrap code      : ', userChoices.installNpmPackages ? 'yes' : 'no');
  } else if (type === TYPE_FLOW) {
    log.blue('Flow name           : ', userChoices.flowName);
    log.blue('# of pages in flow  : ', userChoices.totalPagesForFlow);
  }

  log.echo();
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_CONFIRM,
    promptMsg: 'Continue? [Y|n]',
    defaultValue: true
  }, done);
}

exports.run = function (type, done) {

  async.waterfall([

    function (callback) {
      _gatherUserChoices(type, callback);
    },
    function (callback) {
      _displaySummaryAndConfirmation(type, function (err, answer) {
        if (!err && answer) {
          callback();
        } else {
          log.echo('Bye then...');
          callback(-1);
        }
      });
    },
    function (callback) {
      if (type === TYPE_APP) {
        // generate the app
        _buildFiles(TYPE_APP, userChoices.rootPath, function (err) {
          // and 2 example flows
          if (!err) {
            userChoices.flowName = 'home';
            userChoices.totalPagesForFlow = 1;
            pagesName = ['page1'];
            var appPath = path.join(userChoices.rootPath, userChoices.appName);
            _buildFiles(TYPE_FLOW, appPath, function () {
              userChoices.flowName = 'decisions';
              userChoices.totalPagesForFlow = 1;
              pagesName = ['page1'];
              var appPath = path.join(userChoices.rootPath, userChoices.appName);
              _buildFiles(TYPE_FLOW, appPath, callback);
            });
          } else {
            callback(err);
          }
        });
      } else if (type === TYPE_FLOW) {
        _buildFiles(TYPE_FLOW, userChoices.rootPath, callback);
      } else {
        callback();
      }
    },
    function (callback) {
      if (type === TYPE_APP) {
        log.success('Webapp skeleton created successfully..');
        log.info('Bootstrapping, please wait...');
        if (userChoices.installNpmPackages) {
          log.notice('Estimated remaining time: 3 minutes...');
          var appPath = path.join(userChoices.rootPath, userChoices.appName);
          utilities.installLocalNpmPackages(appPath, function (err) {
            if (err) {
              callback(err);
            } else {
              // let's run a mvn clean to install local node and npm
              cmd.run('mvn clean', {
                status: true,
                verbose: false,
                pwd: appPath
              }, function (err) {
                callback(err);
              });
            }
          });
        } else {
          callback();
        }
      } else {
        callback();
      }
    }
  ], function (err) {
    if (!err) {
      if (type === TYPE_APP) {
        log.success('Webapp skeleton bootstrapped successfully');
        log.echo();
        log.echo('You can type \'cd ' + userChoices.appName +
          ' && mvn jetty:run\' and access your app at:');
        log.echo('http://localhost:8080/' + userChoices.appName + '-' +
          userChoices.appVersion + '/flow/home/page/page1');
      } else if (type === TYPE_FLOW) {
        log.success('Flow ' + userChoices.flowName + ' created successfully');
        log.echo();
        _extractAppInformation(path.join(userChoices.rootPath), function (err, name, version) {
          if (!err) {
            log.echo('Type \'mvn jetty:run\' and access your new flow at:');
            log.echo('http://localhost:8080/' + name + '-' + version + '/flow/' +
              userChoices.flowName + '/page/page1');
          }
        });
      }
      log.echo();
      done();
    } else {
      done(err);
    }
  });
};
