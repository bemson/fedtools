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
    name: ''
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
  moduleName = userChoices.name;

  files.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), moduleName);
    tpl = fs.readFileSync(file, 'utf8');
    buffer = mustache.render(tpl, {
      moduleName: moduleName
    });
    if (buffer) {
      mkdirp.sync(path.join(dstPath, moduleName, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, moduleName, destFileName), buffer);
      buffer = null;
    }
  });
  done();
}

function _promptForModuleName(done) {
  utilities.promptAndContinue({
    promptType: utilities.PROMPT_PROMPT,
    promptMsg: 'Please type the name of the module you want to create',
  }, done);
}

exports.run = function (moduleName, done) {

  async.waterfall([
    function (callback) {
      _promptForModuleName(function (err, value) {
        if (!err) {
          userChoices.moduleName = value;
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
      _buildFiles(path.join(rootPath, 'wf2', 'src'), callback);
    },
  ], function (err, data) {
    done(err, data);
  });

};
