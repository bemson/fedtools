/*jshint node:true, unused:false*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),
  mustache = require('mustache'),
  prompt = require('promptly'),
  glob = require('glob'),
  mkdirp = require('mkdirp'),
  async = require('async'),

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities'),

  userChoices = {
    moduleName: '',
    baseName: '',
    className: '',
    namespace: 'WF2',
    moduleType: 'widget',
    overwrite: false
  },
  cwd = process.cwd(),
  tplDir = path.join(__dirname, '..', 'data', 'templates'),
  tplExtension = '.wf2.mustache',
  tplFileName = 'TPL-FILE-NAME';


function _askForExistingRepoPath(callback) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Please type an existing repository path, or ENTER to use the current path:',
    defaultValue: cwd,
    validator: function (value) {
      var pathForNewModule;
      value = utilities.resolvePath(value);
      pathForNewModule = path.resolve(value);
      if (!fs.existsSync(pathForNewModule)) {
        log.error('Invalid path: ', value);
        throw new Error();
      } else {
        return pathForNewModule;
      }
    }
  }, callback);
}

function _checkForRepoPathValidity(pathForNewModule, callback) {
  // Alright, user wants to clone into pathForClone
  // Let's make sure it's not a git repository...
  utilities.findGitRootPath({
    cwd: pathForNewModule
  }, function (err, rootPath) {
    if (err) {
      log.error('Invalid path, it is not a git repo...');
      _askForExistingRepoPath(function (err, repo) {
        _checkForRepoPathValidity(repo, callback);
      });
    } else {
      var wf2SrcPath = path.join(rootPath, 'wf2', 'src');
      if (!fs.readdirSync(wf2SrcPath)) {
        log.error('Invalid path, it does not look like a wria2 path...');
        _askForExistingRepoPath(function (err, repo) {
          _checkForRepoPathValidity(repo, callback);
        });
      } else {
        // valid path
        callback(null, rootPath);
      }
    }
  });
}

function _getFinalName(filename, moduleName) {
  return filename.replace(tplExtension, '').replace(tplFileName, moduleName);
}

function _buildFiles(dstPath, done) {
  var i, files, tpl, buffer, moduleName;

  files = glob.sync(tplDir + '/**/*' + tplExtension);
  moduleName = userChoices.moduleName;

  files.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), moduleName);
    tpl = fs.readFileSync(file, 'utf8');
    buffer = mustache.render(tpl, {
      moduleName: moduleName,
      className: userChoices.className,
      baseName: userChoices.baseName,
      namespace: userChoices.namespace
    });
    if (buffer) {
      mkdirp.sync(path.join(dstPath, moduleName, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, moduleName, destFileName), buffer);
      buffer = null;
    }
  });
  done();
}

function _promptForInput(options, done) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: options.msg,
    defaultValue: (options.defaultValue) ? options.defaultValue : null
  }, done);
}

function _displaySummaryAndPromptToContinue(rootPath, done) {
  log.echo();
  log.title('SUMMARY OF OPTIONS');
  log.echo();
  log.blue('Module type       : ', userChoices.moduleType);
  log.blue('Module name       : ', userChoices.moduleName);
  log.blue('Module class name : ', userChoices.className);
  log.blue('Module base name  : ', userChoices.baseName);
  log.blue('Namespace         : ', userChoices.namespace);
  log.blue('Module path       : ', path.join(rootPath, 'wf2', 'src', userChoices.moduleName));
  if (userChoices.overwrite) {
    log.yellow('Overwite existing : yes');
  }

  log.echo();

  utilities.promptAndContinue({
    promptType: utilities.PROMPT_CONFIRM,
    promptMsg: 'Continue? [Y|n]',
    defaultValue: true
  }, done);
}

function _extractModuleInfoFromName(name) {
  var str;
  if (name.indexOf('wf2-') === 0) {
    str = name.replace('wf2-', '');
    userChoices.className = str.charAt(0).toUpperCase() + str.slice(1);
    userChoices.baseName = 'wf2' + userChoices.className;
  }
}

function _checkIfModuleExistsAndConfirm(rootPath, done) {
  var modulePath = path.join(rootPath, 'wf2', 'src', userChoices.moduleName);
  if (fs.existsSync(modulePath)) {
    userChoices.overwrite = true;
    log.warning('The module ' + userChoices.moduleName + ' already exists!');
    utilities.promptAndContinue({
      promptType: utilities.PROMPT_CONFIRM,
      promptMsg: 'Continue? [Y|n]',
      defaultValue: true
    }, done);
  } else {
    done(null, true);
  }
}

exports.run = function (moduleName, done) {

  async.waterfall([
    function (callback) {
      _promptForInput({
        msg: 'Type the name of the module you want to create (ex: wf2-section): '
      }, function (err, value) {
        if (!err) {
          userChoices.moduleName = value;
          _extractModuleInfoFromName(value);
          callback();
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      _promptForInput({
        msg: 'Type the class name of the module you want to create, or ENTER for default [' + userChoices
          .className + ']: ',
        defaultValue: userChoices.className
      }, function (err, value) {
        if (!err) {
          userChoices.className = value;
          callback();
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      _promptForInput({
        msg: 'Type the base name of the module you want to create, or ENTER for default [' + userChoices
          .baseName + ']: ',
        defaultValue: userChoices.baseName
      }, function (err, value) {
        if (!err) {
          userChoices.baseName = value;
          callback();
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      _promptForInput({
        msg: 'Type the namespace for the module you want to create,' + ' or ENTER for default [' + userChoices
          .namespace + ']: ',
        defaultValue: userChoices.namespace
      }, function (err, value) {
        if (!err) {
          userChoices.namespace = value;
          callback();
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      _askForExistingRepoPath(function (err, data) {
        if (!err) {
          _checkForRepoPathValidity(data, callback);
        } else {
          callback(-1);
        }
      });
    },
    function (rootPath, callback) {
      _checkIfModuleExistsAndConfirm(rootPath, function (err, answer) {
        if (!err && answer) {
          callback(null, rootPath);
        } else if (!err && !answer) {
          log.echo('Bye then...');
          callback(1);
        } else {
          callback(err);
        }
      });
    },
    function (rootPath, callback) {
      _displaySummaryAndPromptToContinue(rootPath, function (err, answer) {
        if (!err && answer) {
          callback(null, rootPath);
        } else if (!err && !answer) {
          log.echo('Bye then...');
          callback(1);
        } else {
          callback(err);
        }
      });
    },
    function (rootPath, callback) {
      _buildFiles(path.join(rootPath, 'wf2', 'src'), callback);
    },
  ], function (err, data) {
    if (!err) {
      log.success('Module ' + userChoices.moduleName + ' created successfully');
      log.echo();
    }
    done(err, data);
  });

};
