/*jshint node:true*/

var _ = require('underscore'),
  moment = require('moment'),
  path = require('path'),
  fs = require('fs'),

  log = require('./logs'),
  cmd = require('./commands.js'),
  timeTrackerStart;

/**
 * Wrapper to execute a git command and trap the result
 *
 * @method _runGitCommand
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 2 arguments:
 *    @param {Object} error Not null if there is a problem with the command.
 *    @param {String} stdOut The result string without the trailing \n
 */

function _runGitCommand(cmdline, options, done) {
  cmd.run(cmdline, {
    pwd: options.cwd,
    silent: (_.isBoolean(options.silent)) ? options.silent : true,
    inherit: (options.verbose) ? true : false
  }, function (err, data) {
    if (!err && data) {
      data = data.toString().replace(/\n$/, '');
    }
    done(err, data);
  });
}

function _checkoutBranch(options, done) {
  _runGitCommand('git checkout ' + options.branch, options, done);
}

function _cloneGitRepository(options, done) {
  _runGitCommand('git clone ' + options.url + ' ' + (options.name || ''),
    options, done);
}

/**
 * Checks if the current path is a git repository.
 *
 * @method _isGitRepository
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 1 argument:
 *    @param {Object} error Not null if the current path is not a git repository.
 */

function _isGitRepository(options, done) {
  _runGitCommand('git symbolic-ref HEAD', options, done);
}

/**
 * Find the current branch of a git repository
 *
 * @method _getCurrentBranch
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 2 arguments:
 *    @param {Object} error Not null if the current path is not a git repository.
 *    @param {String} branchName The name of the active branch of the repository
 */

function _getCurrentBranch(options, done) {
  _runGitCommand('git rev-parse --abbrev-ref HEAD', options, done);
}

/**
 * Finds the root path of a git repository.
 *
 * @method _findGitRootPath
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 2 arguments:
 *    @param {Object} error If success, this will be null
 *    @param {String} rootPath The path to the root of the repository
 */

function _findGitRootPath(options, done) {
  _runGitCommand('git rev-parse --show-toplevel', options, done);
}

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
  _findGitRootPath(options, function (err, rootPath) {
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

exports.timeTracker = _timeTracker;
exports.getWF2srcPath = _getWF2srcPath;
exports.isGitRepository = _isGitRepository;
exports.getCurrentBranch = _getCurrentBranch;
exports.findGitRootPath = _findGitRootPath;
exports.cloneGitRepository = _cloneGitRepository;
exports.checkoutBranch = _checkoutBranch;
