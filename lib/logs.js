/*jshint node:true*/

var clc = require('cli-color'),
  vsprintf = require('sprintf').vsprintf,

  state = {
    'info': {
      'log': (process.platform === 'win32') ? clc.cyan : clc.blue,
      'label': '  INFO   '
    },
    'notice': {
      'log': clc.yellow,
      'label': ' NOTICE  '
    },
    'warning': {
      'log': clc.yellow,
      'label': ' WARNING '
    },
    'success': {
      'log': clc.green,
      'label': ' SUCCESS '
    },
    'error': {
      'log': clc.red,
      'label': '  ERROR  '
    },
    'fatal': {
      'log': clc.red,
      'label': '  FATAL  '
    }
  };

function _displayStatus(type) {
  process.stdout.write(clc.move(80, -1));
  console.log('[' + state[type].log(state[type].label) + ']');
}

function _capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

var _buildString = function (truncate, args) {
  var outString = '',
    i, len = args.length,
    buffer = '',
    values = [];

  if (args.length === 1) {
    outString = args['0'].toString();
  } else if (args.length !== 0) {

    for (i = 1; i < len; i += 1) {
      values.push(args[i]);
      buffer = buffer + '%s ';
    }
    outString = vsprintf(args[0] + buffer, values).toString();
  }

  if (truncate && outString.length > 75) {
    outString = outString.slice(0, 75) + '...';
  }
  return outString;
};

/************************************
 * Status logs (info, notice, etc.) *
 ************************************/
/**
 * Remove the previous line in the console.
 * It's usefull if something needs to be displayed temporarily, and then
 * replaced by a final statement.
 *
 * @method clearPreviousLine
 *
 * @example
 *     log.echo('Running: command is running');
 *     longRunningTask();
 *     log.clearPreviousLine();
 *     log.success('Command: command as successfully ended');
 */
module.exports.clearPreviousLine = function () {
  process.stdout.write(clc.move(0, -1));
};
/**
 * Prints a string with a [ INFO ] appended at the end on the command prompt.
 * The color of the string is blue.
 *
 * @method info
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.info('this is an info');
 *     log.info('status %s received', status);
 */
module.exports.info = function () {
  console.log(state.info.log(_capitalize(_buildString(true, arguments))));
  _displayStatus('info');
};
/**
 * Prints a string with a [ NOTICE ] appended at the end on the command prompt.
 * The color of the string is yellow.
 *
 * @method notice
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.notice('this is a notice');
 *     log.notice('status %s received', status);
 */
module.exports.notice = function () {
  console.log(state.notice.log(_capitalize(_buildString(true, arguments))));
  _displayStatus('notice');
};
/**
 * Prints a string with a [ WARNING ] appended at the end on the command prompt.
 * The color of the string is yellow.
 *
 * @method warning
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.warning('this is a warning');
 *     log.warning('status %s received', status);
 */
module.exports.warning = function () {
  console.log(state.warning.log(_capitalize(_buildString(true, arguments))));
  _displayStatus('warning');
};
/**
 * Prints a string with a [ SUCCESS ] appended at the end on the command prompt.
 * The color of the string is green.
 *
 * @method success
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.success('this is a success');
 *     log.success('status %s received', status);
 */
module.exports.success = function () {
  console.log(state.success.log(_capitalize(_buildString(true, arguments))));
  _displayStatus('success');
};
/**
 * Prints a string with a [ ERROR ] appended at the end on the command prompt.
 * The color of the string is red.
 *
 * @method error
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.error('this is an error');
 *     log.error('status %s received', status);
 */
module.exports.error = function () {
  console.log(state.error.log(_capitalize(_buildString(true, arguments))));
  _displayStatus('error');
};
/**
 * Prints a string with a [ FATAL ] appended at the end on the command prompt.
 * The color of the string is red.
 *
 * @method fatal
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.fatal('this is a fatal error');
 *     log.fatal('status %s received', status);
 */
module.exports.fatal = function () {
  console.log(state.fatal.log(_capitalize(_buildString(true, arguments))));
  _displayStatus('fatal');
};

/****************
 * Colored logs *
 ****************/
/**
 * Prints a string on the command prompt.
 * The color of the string is default white.
 *
 * @method echo
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.echo('this is an error');
 *     log.echo('status %s received', status);
 */
module.exports.echo = function () {
  console.log(_buildString(false, arguments));
};
/**
 * Prints a string on the command prompt.
 * The color of the string is blue.
 *
 * @method blue
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.blue('this is an information');
 *     log.blue('status %s received', status);
 */
module.exports.blue = function () {
  if (process.platform === 'win32') {
    console.log(clc.cyan(_buildString(false, arguments)));
  } else {
    console.log(clc.blue(_buildString(false, arguments)));
  }
};
/**
 * Prints a string on the command prompt.
 * The color of the string is red.
 *
 * @method red
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.red('this is an information');
 *     log.red('status %s received', status);
 */
module.exports.red = function () {
  console.log(clc.red(_buildString(false, arguments)));
};
/**
 * Prints a string on the command prompt.
 * The color of the string is yellow.
 *
 * @method yellow
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.yellow('this is an information');
 *     log.yellow('status %s received', status);
 */
module.exports.yellow = function () {
  console.log(clc.yellow(_buildString(false, arguments)));
};
/**
 * Prints a string on the command prompt.
 * The color of the string is green.
 *
 * @method green
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.green('this is an information');
 *     log.green('status %s received', status);
 */
module.exports.green = function () {
  console.log(clc.green(_buildString(false, arguments)));
};
/**
 * Prints a string that is supposed to be a title on the command prompt.
 * The color of the string is blue with underline decoration.
 *
 * @method title
 * @param {String|...} str A string or multiple arguments that can be merged into
 * a string using sprintf (the same style that could be used for console.log).
 *
 * @example
 *     log.echo('Repository overview');
 */
module.exports.title = function () {
  if (process.platform === 'win32') {
    console.log(clc.cyan.underline(_buildString(false, arguments)));
  } else {
    console.log(clc.blue.underline(_buildString(false, arguments)));
  }
};
