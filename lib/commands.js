/*jshint node:true*/

var log = require('./logs'),
  child = require('child_process'),
  shell = require('shelljs'),
  _ = require('underscore'),

  MAX_DISPLAY_CHARS = 65;

var _exec = function (cmdLine, cmdLineDisplay, options, callback) {
  var pwd = null,
    silent = false;

  if (options) {
    if (options.pwd) {
      pwd = options.pwd;
    }
    if (options.silent) {
      silent = true;
    }
  }

  if (!silent) {
    log.echo('Running: ' + cmdLineDisplay);
  }
  child.exec(cmdLine, {
    cwd: pwd ? pwd : process.cwd()
  }, function (error, stdout, stderr) {
    if (error) {
      if (!silent) {
        log.clearPreviousLine();
        log.error('Command: ' + cmdLineDisplay);
      }
      if (stderr) {
        if (callback) {
          callback(stderr);
        }
      } else {
        if (callback) {
          callback(error);
        }
      }
    } else {
      if (!silent) {
        log.clearPreviousLine();
        log.success('Command: ' + cmdLineDisplay);
      }
      if (callback) {
        callback(null, stdout);
      }
    }
  });
};

var _spawn = function (cmdLine, cmdLineDisplay, options, callback) {
  var sArgs = cmdLine.split(' '),
    sCmd = sArgs.shift(),
    pwd = null,
    silent = false,
    cp;

  if (options) {
    if (options.silent) {
      silent = true;
    }
    if (options.pwd) {
      pwd = options.pwd;
    }
  }

  if (!silent) {
    log.echo('Running: ' + cmdLineDisplay);
  }

  if (process.platform === 'win32' && (
    (sCmd.length < 4) ||
    sCmd.substr(sCmd.length - 4, sCmd.length - 1) !== '.exe')) {

    // attempting to spawn a non-executable process on windows... do some magic ;)
    // see https://github.com/joyent/node/issues/2318#issuecomment-3219836
    sArgs = ['/s', '/c', sCmd].concat(sArgs);
    sCmd = 'cmd';
  }

  cp = child.spawn(sCmd, sArgs, {
    stdio: 'inherit',
    cwd: pwd,
    windowsVerbatimArguments: true
  });
  cp.on('close', function (data) {
    if (data !== 0) {
      if (!silent) {
        log.echo();
        log.clearPreviousLine();
        log.error('Command: ' + cmdLineDisplay);
      }
      callback(data);
    } else {
      if (!silent) {
        log.echo();
        log.clearPreviousLine();
        log.success('Command: ' + cmdLineDisplay);
      }
      callback();
    }
  });
};

var _runSync = function (cmds, options, callback) {
  var len = cmds.length,
    silent = false,
    inherit = false,
    currentDir = process.cwd(),
    result, i, display, oldDir;

  if (options) {
    if (options.silent) {
      silent = true;
    }
    if (options.inherit) {
      inherit = true;
    }
    if (options.pwd) {
      process.chdir(options.pwd);
    }
  }

  for (i = 0; i < len; i += 1) {
    display = cmds[i].slice(0, MAX_DISPLAY_CHARS) + '...';
    if (!silent) {
      log.echo('Running: ' + display);
    }
    result = shell.exec(cmds[i], {
      silent: !inherit
    });
    if (!silent) {
      log.clearPreviousLine();
      log.success('Command: ' + display);
    }
  }

  if (oldDir) {
    process.chdir(currentDir);
  }

  if (callback) {
    callback();
  } else {
    return result;
  }
};

/**
 * Execute shell scripts asynchronously or synchronously.
 *
 * @example
 *     var cmd = requires('./commands.js');
 *
 *     var res = cmd.run('git status', { silent: true, inherit: true });
 *     console.log('result code (%s) output (%s)', res.code, res.output)
 *
 *     cmd.run(['git status', 'git describe']);
 *
 *     cmd.run('ps aux | grep selleck', {
 *       silent: true
 *     }, function (error, stdout) {
 *       if (error) {
 *         console.error(error);
 *         return error;
 *       }
 *       return stdout.replace(/\n$/, '');
 *     });
 *
 * @method run
 * @async
 * @param {String|Array} cmdLine Command line to execute. If multiple command lines,
 * pass an Array. In that case, the commands will run one after the other and the
 * callback will be ignored: the call to the method becomes synchronous an returns an
 * object.
 * @param {Object} options A configuration object
 *  @param {Boolean} [options.silent=false] Flag to turn success/error logs ON or OFF
 *  @param {Boolean} [options.inherit=false] Flag to turn command output ON or OFF
 *  @param {String} [options.pwd] Path where the command should be executed from
 * @param {Function} [callback] A callback  function to be called once the command has
 * been executed. If not provided, the command will run synchronously. It will be
 * completely ignored if multiple commands are passed via an Array.
 * @return {Object} If no callback is provided, returns `obj.code` and `obj.output`
 */
exports.run = function (cmdLine, options, callback) {
  var syncFlag = false,
    display;
  if (_.isArray(cmdLine) || !callback) {
    syncFlag = true;
    if (!_.isArray(cmdLine)) {
      cmdLine = [cmdLine];
    }
    return _runSync(cmdLine, options, callback);
  } else {
    display = cmdLine.slice(0, MAX_DISPLAY_CHARS) + '...';
    if (options && options.inherit) {
      _spawn(cmdLine, display, options, callback);
    } else {
      _exec(cmdLine, display, options, callback);
    }
  }
};
