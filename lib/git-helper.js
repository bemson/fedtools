/*jshint node:true*/

var _ = require('underscore'),
  cmd = require('fedtools-commands');

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
    status: (_.isBoolean(options.silent)) ? !options.silent : false,
    verbose: (options.verbose) ? true : false
  }, function (err, stderr, stdout) {
    if (!err && stdout) {
      stdout = stdout.toString().replace(/\n$/, '');
    }
    done(err, stdout);
  });
}

exports.getCurrentSHA = function (options, done) {
  var cmdline = (options && options.short) ? 'git log --pretty=format:%h -1' :
    'git log --pretty=format:%H -1';
  _runGitCommand(cmdline, options, done);
};

exports.checkoutBranch = function (options, done) {
  _runGitCommand('git fetch', options, function () {
    _runGitCommand('git checkout ' + options.branch, options, done);
  });
};

exports.cloneGitRepository = function (options, done) {
  var cmdClone = 'git clone';
  if (options && options.cloneArgs) {
    cmdClone = cmdClone.trim() + ' ' + options.cloneArgs.trim();
  }
  _runGitCommand(cmdClone.trim() + ' ' + options.url.trim() + ' ' + (options.name.trim() || ''),
    options, done);
};

exports.gitFetchLatestFromOrigin = function (options, done) {
  _runGitCommand('git fetch', options, done);
};

exports.gitAddUpstreamRemote = function (options, done) {
  _runGitCommand('git remote add upstream ' + options.url, options, done);
};

/**
 * Checks if the current path is a git repository.
 *
 * @method _isGitRepository
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 1 argument:
 *    @param {Object} error Not null if the current path is not a git repository.
 */

exports.isGitRepository = function (options, done) {
  _runGitCommand('git symbolic-ref HEAD', options, done);
};

/**
 * Find the current branch of a git repository
 *
 * @method _getCurrentBranch
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 2 arguments:
 *    @param {Object} error Not null if the current path is not a git repository.
 *    @param {String} branchName The name of the active branch of the repository
 */

exports.getCurrentBranch = function (options, done) {
  _runGitCommand('git rev-parse --abbrev-ref HEAD', options, done);
};

/**
 * Finds the root path of a git repository.
 *
 * @method _findGitRootPath
 * @return {Function} Callback function to execute when done
 *   The callback parameter takes 2 arguments:
 *    @param {Object} error If success, this will be null
 *    @param {String} rootPath The path to the root of the repository
 */

exports.findGitRootPath = function (options, done) {
  _runGitCommand('git rev-parse --show-toplevel', options, done);
};
