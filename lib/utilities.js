/*jshint node:true*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),
  prompt = require('promptly'),
  findit = require('findit'),
  treeify = require('treeify'),
  os = require('osenv'),
  mkdirp = require('mkdirp'),
  async = require('async'),
  log = require('fedtools-logs'),
  cmd = require('fedtools-commands'),

  gith = require('./git-helper'),
  timeTrackerStart,

  PROMPT_CONFIRM = 'confirm',
  PROMPT_PROMPT = 'prompt';

/**
 * Start or stop a timer.
 * Stopping the timer will also display the result in minutes, seconds and milliseconds.
 * The default introductory text ('Elapsed time:') can be overridden.
 *
 * @method _timeTracker
 * @param {String} type The timeTracker action type ('start' or 'stop')
 * @param {String} [label] The introductory text to display when the timer stops.
 * Default to "Elapsed time: "
 *
 * @example
 *     utilities.timeTracker('start');
 *     longRunningTask();
 *     utilities.timeTracker('stop');
 */

function _timeTracker(type, label) {
  if (type === 'start') {
    timeTrackerStart = process.hrtime();
  }
  if (type === 'stop') {
    var precision = 3,
      elapsedTotal = process.hrtime(timeTrackerStart)[0] * 1000 + process.hrtime(
        timeTrackerStart)[1] / 1000000,
      duration = moment.duration(elapsedTotal, 'milliseconds'),
      arrElapse = [
        duration.get('minutes') ? duration.get('minutes') + 'm' : '',
        duration.get('seconds') ? duration.get('seconds') + 's' : '',
        duration.get('ms') ? duration.get('ms').toFixed(precision) + 'ms' : ''
      ],
      intro = label ? label : 'Elapsed time: ';

    log.echo(intro + _.compact(arrElapse).join(', '));

    // reset the timer
    timeTrackerStart = process.hrtime();
  }
}

/**
 * Finds the wf2/src path of a wria2 git repository.
 *
 * @method _getWF2srcPath
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 2 arguments:
 *    @param {Object} error If success, this will be null
 *    @param {String} srcPath The path to wf2/src of the wria2 repository
 */

function _getWF2srcPath(options, done) {
  var srcPath;
  gith.findGitRootPath(options, function (err, rootPath) {
    if (err) {
      done(err);
    } else {
      srcPath = path.join(rootPath, 'wf2', 'src');
      if (fs.existsSync(srcPath)) {
        done(null, srcPath);
      } else {
        done(1);
      }
    }
  });
}

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
    if (config.defaultValue !== undefined) {
      prompt.prompt(config.promptMsg, {
        'default': config.defaultValue,
        validator: config.validator
      }, done);
    } else {
      prompt.prompt(config.promptMsg, {
        validator: config.validator
      }, done);
    }

  }
}
exports.PROMPT_CONFIRM = 'confirm';
exports.PROMPT_PROMPT = 'prompt';

function _resolvePath(pathString) {
  var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return path.resolve(pathString.replace('~', home));
}

function _objectSort(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  var keys = Object.keys(obj).sort(),
    o = {};
  keys.forEach(function (i) {
    o[i] = _objectSort(obj[i]);
  });
  return o;
}

function _parseTree(start, root, callback) {
  var finder = findit(start),
    tree = {};

  finder.on('path', function (file, stat) {
    var relativePath = path.relative(start, file),
      node = tree,
      parts = relativePath.split(path.sep);

    if (relativePath.indexOf('..') !== 0) {
      parts.forEach(function (part, key) {
        if (key < (parts.length - 1) || stat.isDirectory()) {
          part += path.sep;
        }
        if (typeof node[part] !== 'object') {
          node[part] = {};
        }
        node = node[part];
      });
    }
  });

  finder.on('end', function () {
    tree = _objectSort(tree);
    var str = treeify.asTree(tree, true),
      out = '',
      rel = path.relative(path.join(root, '../'), start),
      len = rel.split(path.sep)[0].length,
      pad = function (str) {
        for (var i = 0; i <= len; i += 1) {
          str = ' ' + str;
        }
        str = str.replace('─', '──');
        return str;
      };

    str = str.split('\n');

    out += '   ' + rel + '\n';
    str.forEach(function (s) {
      out += '   ' + pad(s) + '\n';
    });
    callback(out);
  });
}

function _isWindows() {
  return (process.platform === 'win32');
}

function _wordWrap(str, width) {
  var regex;

  width = width || 75;
  if (!str) {
    return str;
  }
  regex = '.{1,' + width + '}(\\s|$)|\\S+?(\\s|$)';
  return str.match(new RegExp(regex, 'g'));
}

exports.camelCase = function (input) {
  var str = input.toLowerCase().replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

function _installLocalNpmPackages(srcPath, done) {
  var nodeModulesPath = path.join(srcPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    cmd.run('npm install', {
      status: true,
      verbose: false,
      pwd: srcPath
    }, function (err) {
      if (err) {
        log.error('Unable to install npm packages!');
        done(err);
      } else {
        done(null);
      }
    });
  } else {
    done(null);
  }
}

exports.getTemporaryDir = function () {
  var tmpDir = path.join(os.tmpdir(), 'fedtools-tmp');
  if (!fs.existsSync(tmpDir)) {
    mkdirp.sync(tmpDir);
  }
  return tmpDir;
};

exports.wria2bump = function (debug, done) {
  var msg = 'Type the new version number you want to set: ',
    shifterCfg, currentVersion;

  _getWF2srcPath({
    cwd: process.cwd()
  }, function (err, srcPath) {
    if (!err && srcPath) {
      var shifterJsonFile = path.join(srcPath, '.shifter.json');

      if (!fs.existsSync(shifterJsonFile)) {
        log.error('Ooops! It looks like you\'re missing a .shifter.json configuration file!');
        done(-1);
      } else {
        shifterCfg = JSON.parse(fs.readFileSync(shifterJsonFile, 'utf8'));
        currentVersion = shifterCfg['replace-wf2_version'];
        log.info('The current version is: ', currentVersion);

        _promptAndContinue({
          promptType: PROMPT_PROMPT,
          promptMsg: msg
        }, function (err, newVersion) {
          shifterCfg['replace-wf2_version'] = newVersion;
          fs.writeFileSync(shifterJsonFile, JSON.stringify(shifterCfg, null, 2));

          async.waterfall([

            function (callback) {
              var cmdline = 'mvn versions:set -DnewVersion=' + newVersion +
                ' -DgenerateBackupPoms=false';
              cmd.run(cmdline, {
                pwd: path.join(srcPath, '..', '..')
              }, function (err) {
                callback(err);
              });
            }
          ], function (err) {
            if (!err) {
              log.echo();
              log.info('All files have been updated with the new version.');
              log.info('Make sure it looks fine, then stage, commit and push!');
              log.echo();
            }
            done(err);
          });

        });
      }

    } else {
      log.error('Is the current a wria2 path?');
      log.echo();
      done(-1);
    }
  });
};

exports.installLocalNpmPackages = _installLocalNpmPackages;

exports.timeTracker = _timeTracker;
exports.getWF2srcPath = _getWF2srcPath;

exports.promptAndContinue = _promptAndContinue;
exports.resolvePath = _resolvePath;
exports.parseTree = _parseTree;

exports.isWindows = _isWindows;
exports.wordWrap = _wordWrap;
