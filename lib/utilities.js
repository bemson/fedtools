/*jshint node:true*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),
  prompt = require('promptly'),
  findit = require('findit'),
  treeify = require('treeify'),
  log = require('fedtools-logs'),

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
    prompt.prompt(config.promptMsg, {
      'default': config.defaultValue,
      validator: config.validator
    }, done);
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

exports.timeTracker = _timeTracker;
exports.getWF2srcPath = _getWF2srcPath;

exports.promptAndContinue = _promptAndContinue;
exports.resolvePath = _resolvePath;
exports.parseTree = _parseTree;

exports.isWindows = _isWindows;
exports.wordWrap = _wordWrap;
