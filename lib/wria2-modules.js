/*jshint node:true, unused:true*/

var path = require('path'),
  fs = require('fs'),
  mustache = require('mustache'),
  glob = require('glob'),
  mkdirp = require('mkdirp'),
  async = require('async'),
  rimraf = require('rimraf'),
  bp = require('simple-boilerplate'),

  log = require('./logs'),
  utilities = require('./utilities'),
  gith = require('./git-helper'),

  MODULE_TYPES = /widget|js/ig,
  userChoices = {
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
  gith.findGitRootPath({
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

function _isFileUsedForSkin(file) {
  return (path.extname(file) === '.scss');
}

function _buildWt2Files(dstPath, done) {
  var boilerplate,
    rootPath = path.resolve(dstPath, '..', '..'),
    buildPath = path.join(rootPath, 'build'),
    wt2moduleName = userChoices.moduleName.replace('wf2-', ''),
    TEMPLATE_SOURCE = path.join(buildPath, 'templates', 'wt2-module'),
    REPLACEMENTS = [{
      what: 'MODNAME',
      with: wt2moduleName
    }, {
      what: 'SOY_TEMPLATE_MAME',
      with: wt2moduleName.toUpperCase().replace(/-/g, '')
    }];

  boilerplate = new bp(TEMPLATE_SOURCE, REPLACEMENTS);
  boilerplate.generate(dstPath, done);
}

function _buildFiles(dstPath, done) {
  var files, dotFiles, tpl, buffer, moduleName, rootPath;

  files = glob.sync(tplDir + '/**/*' + tplExtension);
  dotFiles = glob.sync(tplDir + '/**/.*' + tplExtension);
  moduleName = userChoices.moduleName;
  rootPath = path.resolve(dstPath, '..', '..');

  files.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), moduleName);
    tpl = fs.readFileSync(file, 'utf8');
    // ignore skin file if type is not widget
    if (!(userChoices.moduleType === 'js' && _isFileUsedForSkin(destFileName))) {
      buffer = mustache.render(tpl, {
        moduleName: moduleName,
        className: userChoices.className,
        baseName: userChoices.baseName,
        namespace: userChoices.namespace,
        moduleExtends: userChoices.moduleExtends,
        widget: (userChoices.moduleType === 'widget') ? true : false
      });
      if (buffer) {
        mkdirp.sync(path.join(dstPath, moduleName, path.dirname(destFileName)));
        fs.writeFileSync(path.join(dstPath, moduleName, destFileName), buffer);
        buffer = null;
      }
    }
  });

  dotFiles.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), moduleName);
    tpl = fs.readFileSync(file, 'utf8');
    buffer = mustache.render(tpl, {
      moduleName: moduleName,
      className: userChoices.className,
      baseName: userChoices.baseName,
      namespace: userChoices.namespace,
      moduleExtends: userChoices.moduleExtends,
      widget: (userChoices.moduleType === 'widget') ? true : false
    });
    if (buffer) {
      mkdirp.sync(path.join(dstPath, moduleName, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, moduleName, destFileName), buffer);
      buffer = null;
    }
  });

  // create a wt2_module too if that's requested
  if (userChoices.wt2module) {
    _buildWt2Files(dstPath, function (err) {
      done(err, path.join(dstPath, moduleName), rootPath);
    });
  } else {
    done(null, path.join(dstPath, moduleName), rootPath);
  }
}

function _promptForInput(options, done) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: options.msg,
    validator: options.validator,
    defaultValue: (options.defaultValue) ? options.defaultValue : null
  }, done);
}

function _displaySummaryAndPromptToContinue(rootPath, done) {
  log.echo();
  log.title('SUMMARY OF OPTIONS');
  log.echo();
  log.blue('Module type         : ', userChoices.moduleType);
  log.blue('Create a wt2 module : ', userChoices.wt2module);
  log.blue('Module name         : ', userChoices.moduleName);
  log.blue('Module class name   : ', userChoices.className);
  log.blue('Module base name    : ', userChoices.baseName);
  log.blue('Module extends      : ', userChoices.moduleExtends);
  log.blue('Namespace           : ', userChoices.namespace);
  log.blue('Module path         : ', path.join(rootPath, 'wf2', 'src', userChoices.moduleName));
  if (userChoices.overwrite) {
    log.red('Overwite existing : yes');
  }

  log.echo();

  utilities.promptAndContinue({
    promptType: utilities.PROMPT_CONFIRM,
    promptMsg: userChoices.overwrite ? 'Continue? [y|N]' : 'Continue? [Y|n]',
    defaultValue: userChoices.overwrite ? false : true
  }, done);
}

function _extractModuleInfoFromName(name) {
  var str,
    prefix = userChoices.namespace.toLowerCase() + '-';

  name = name.toLowerCase();
  if (name.indexOf(prefix) === 0) {
    str = name.replace(prefix, '');
    str = utilities.camelCase(str);
    userChoices.className = str;
    userChoices.baseName = prefix.slice(0, -1) + str;
  }
}

function _checkIfModuleExistsAndConfirm(rootPath, done) {
  var modulePath = path.join(rootPath, 'wf2', 'src', userChoices.moduleName);
  if (fs.existsSync(modulePath)) {
    userChoices.overwrite = true;
    log.warning('The module ' + userChoices.moduleName + ' already exists!');
    log.warning('It will be erased and replaced...');
    utilities.promptAndContinue({
      promptType: utilities.PROMPT_CONFIRM,
      promptMsg: 'Continue? [y|N]',
      defaultValue: false
    }, done);
  } else {
    done(null, true);
  }
}

exports.run = function (done) {

  async.waterfall([
    function (callback) {
      _promptForInput({
        msg: 'Enter the module type you want to create, or ENTER for default [widget|js]: ',
        defaultValue: userChoices.moduleType,
        validator: function (value) {
          if (!value.match(MODULE_TYPES)) {
            log.error('Invalid module type: ', value);
            throw new Error();
          } else {
            return value.toLowerCase();
          }
        }
      }, function (err, value) {
        if (!err) {
          userChoices.moduleType = value;
          callback();
        } else {
          callback(err);
        }
      });
    },
    function (callback) {
      utilities.promptAndContinue({
        promptType: utilities.PROMPT_CONFIRM,
        promptMsg: 'Do you also need a wt2 module? [Y|n]: ',
        defaultValue: true
      }, function (err, value) {
        if (!err) {
          userChoices.wt2module = value;
          callback();
        } else {
          callback(err);
        }
      });
    },
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
      if (userChoices.moduleType === 'js') {
        userChoices.moduleExtends = 'Y.Base';
      }
      _promptForInput({
        msg: 'Type the class you want to extend, or ENTER for default [' + userChoices
          .moduleExtends + ']: ',
        defaultValue: userChoices.moduleExtends
      }, function (err, value) {
        if (!err) {
          userChoices.moduleExtends = value;
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
      var dstPath = path.join(rootPath, 'wf2', 'src');
      // cleanup first
      rimraf(path.join(dstPath, userChoices.moduleName), function (err) {
        if (!err) {
          // then generate the files
          _buildFiles(dstPath, callback);
        } else {
          callback(err);
        }
      });

    },
  ], function (err, modulePath, rootPath) {
    if (!err) {
      log.success('Module ' + userChoices.moduleName + ' created successfully');
      utilities.parseTree(modulePath, rootPath, function (tree) {
        console.log('\n' + tree);
        done(err);
      });
    }
  });

};
