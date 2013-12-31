/*jshint node:true, unused:true*/

var path = require('path'),
  fs = require('fs'),
  mustache = require('mustache'),
  glob = require('glob'),
  mkdirp = require('mkdirp'),
  async = require('async'),
  rimraf = require('rimraf'),
  log = require('fedtools-logs'),

  utilities = require('./utilities'),

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
  tplDir = path.join(__dirname, '..', 'data', 'templates', 'webapp', 'skeleton'),
  tplExtension = '.webapp.mustache',
  tplFileName = 'TPL-FILE-NAME',
  TYPE_APP = 'webapp-app',
  TYPE_MOD = 'webapp-mod',
  TYPE_FLOW = 'webapp-flow';

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

function _getFinalName(filename, moduleName) {
  return filename.replace(tplExtension, '').replace(tplFileName, moduleName);
}

function _buildFiles(type, dstPath, done) {
  var files, dotFiles, tpl, buffer, moduleName, rootPath;

  files = glob.sync(tplDir + '/**/*' + tplExtension);
  dotFiles = glob.sync(tplDir + '/**/.*' + tplExtension);
  if (type === TYPE_APP) {
    moduleName = 'webapp';
    rootPath = dstPath;
  }

  files.forEach(function (file) {
    var destFileName = _getFinalName(path.relative(tplDir, file), moduleName);
    tpl = fs.readFileSync(file, 'utf8');
    buffer = mustache.render(tpl, {
      moduleName: moduleName,
      className: userChoices.className,
      baseName: userChoices.baseName,
      namespace: userChoices.namespace,
      moduleExtends: userChoices.moduleExtends,
    });
    if (buffer) {
      mkdirp.sync(path.join(dstPath, moduleName, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, moduleName, destFileName), buffer);
      buffer = null;
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
    });

    if (buffer) {
      mkdirp.sync(path.join(dstPath, moduleName, path.dirname(destFileName)));
      fs.writeFileSync(path.join(dstPath, moduleName, destFileName), buffer);
      buffer = null;
    }
  });

  done(null, path.join(dstPath, moduleName), rootPath);
}

exports.run = function (type, done) {

  async.waterfall([

    function (callback) {
      _askForDestinationPath(function (err, data) {
        if (!err) {
          callback(null, data);
        } else {
          callback(-1);
        }
      });
    },
    function (rootPath, callback) {
      if (type === TYPE_APP) {
        // cleanup first
        rimraf(path.join(rootPath, 'webapp'), function (err) {
          if (!err) {
            // then generate the files
            _buildFiles(TYPE_APP, rootPath, callback);
          } else {
            callback(err);
          }
        });
      } else {
        callback();
      }
    },
    function (skeletonPath, rootPath, callback) {
      if (type === TYPE_APP) {
        log.success('Webapp skeleton created successfully');

        utilities.installLocalNpmPackages(skeletonPath, function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null, skeletonPath, rootPath);
          }
        });
      }
    }
  ], function (err, skeletonPath, rootPath) {
    if (!err) {
      if (type === TYPE_APP) {
        log.success('Webapp skeleton bootstrapped successfully');
      } else {
        utilities.parseTree(skeletonPath, rootPath, function (tree) {
          console.log('\n' + tree);
          done(err);
        });
      }
    } else {
      done(err);
    }
  });
};
