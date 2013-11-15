/*jshint node:true*/

var child = require('child_process'),
  _ = require('underscore'),
  path = require('path'),
  jshint = require('jshint/src/cli'),
  fs = require('fs'),
  mustache = require('mustache'),
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),
  glob = require('glob'),
  async = require('async');


/**
 * Spawns a child process silently.
 *
 * @method _spawn
 * @param {String} cmdLine The command to run
 * @param {Function} callback A function to run when the process ends
 */
var _spawn = function (cmdLine, callback) {
  var sArgs = cmdLine.split(' '),
    sCmd = sArgs.shift(),
    resultOut, resultErr,
    cp;

  cp = child.spawn(sCmd, sArgs);
  cp.stdout.on('data', function (data) {
    resultOut = data;
  });
  cp.stderr.on('data', function (data) {
    resultErr = data;
  });
  cp.on('close', function (data) {
    if (data !== 0) {
      callback(data, resultOut, resultErr);
    } else {
      callback(null, resultOut, resultErr);
    }
  });
};

/**
 * Reads a json formatted file and return a json object.
 *
 * @method _readJsonFile
 * @param {String} file The file to read
 * @return {Object} Returns a JSON object
 */
var _readJsonFile = function (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

/**
 * This method loops through a list of files and
 *  - creates temporary directories to dump the content of each staged files.
 *  - creates an array of functions ready to be consumed by async.waterfall().
 *    These functions individually dumps the content of one staged file in
 *    the previously mentioned temporary directory.
 *
 * @method _prepareCommandsToDumpStagedContent
 * @param {Array} files List of files to be processed
 * @param {Function} done A function to run when the process ends
 */
var _prepareCommandsToDumpStagedContent = function (files, done) {
  var cmds = [];
  files.forEach(function (file) {
    var filePath = path.dirname(file),
      fileName = path.basename(file),
      tmpFilePath = path.join(__dirname, 'tmpjs', filePath);

    mkdirp.sync(tmpFilePath);

    cmds.push(
      function (callback) {
        child.exec('git show :' + file + ' > ' + path.join(tmpFilePath, fileName),
          function (error) {
            if (error) {
              return callback(error);
            } else {
              return callback(null);
            }
          }
        );
      });

  });

  done(null, cmds);
};

/**
 * This method runs JSHINT using the following options:
 *  - The files to lint are .js files found under tmpJsDir
 *  - The jshint configuration is found under jsHintConfigFileForJs
 *  - Because the standard printing (console.log/error) cannot be read by
 *    some Git Client (I'm looking at you Windows), the reporting is being
 *    saved in a temporary log file that will be displayed later by the
 *    calling Bash script...
 *
 * @method _lintStagedFiles
 * @param {String} jsHintErrorsLog The file where jshint errors should be logged
 * @param {String} tmpJsDir The temporary directory where files to be linted are
 * @return {Boolean} true on success (no jshint error), false otherwise
 */
var _lintStagedFiles = function (jsHintErrorsLog, tmpJsDir) {
  var resJshint,
    totalErrors = 0,
    jsHintConfigFileForJs = path.join(__dirname, 'jshintForJs.config'),
    jsFilesToLint = glob.sync(tmpJsDir + '/**/*.js'),
    jsHintOptionsForJs = {
      args: jsFilesToLint,
      config: _readJsonFile(jsHintConfigFileForJs),
      reporter: function (results) {
        var buffer = '',
          BUFFER_TPL = '{{{file}}}: Line {{line}}, col {{col}}, {{{message}}}\n',
          FOOTER_TPL = '\n{{totalErrors}} {{errorWord}}\n' +
            'Please fix your lint {{errorWord}} and try to commit again\n\n';
        results.forEach(function (result) {
          if (result.file && result.error && result.error.line &&
            result.error.character && result.error.reason) {
            totalErrors += 1;
            buffer = buffer + mustache.render(BUFFER_TPL, {
              file: path.resolve(result.file).replace(tmpJsDir, ''),
              line: result.error.line,
              col: result.error.character,
              message: result.error.reason
            });
          }
        });

        buffer = buffer + mustache.render(FOOTER_TPL, {
          errorWord: (totalErrors > 1) ? 'errors' : 'error',
          totalErrors: totalErrors
        });

        fs.writeFileSync(jsHintErrorsLog, buffer);
      }
    };

  resJshint = jshint.run(jsHintOptionsForJs);
  if (!resJshint && totalErrors > 0) {
    return false;
  } else {
    return true;
  }
};

/**
 * This is the main method that will
 *  - remove the temporary js directory
 *  - get the list of all .js files currently stagged
 *  - get the list of commands to run on each file to dump their content
 *    in a temporary js directory
 *  - call JSHINT on each of these new files
 *  - if there is no error, the process exits with error code 0.
 *  - if there is at least one lint error, the process exits with error code 1.
 *
 * @method run
 * @param {Object} config A config object
 * @param {String} config.logs The log file where jshint error should be logged.
 * @param {String} config.tmpDir The tmp directories where js files should be dumped.
 */
var run = function (config) {
  var jsHintErrorsLog = config.logs,
    tmpJsDir = config.tmpDir;

  async.waterfall([
    function (callback) {
      rimraf(tmpJsDir, callback);
    },
    function (callback) {
      var jsFilesToLint = [],
        cmd = 'git diff-index --name-only --diff-filter=ACM --cached HEAD --',
        len, i, files;

      _spawn(cmd, function (err, stdout) {
        if (!err && stdout) {
          files = _.compact(stdout.toString().replace(/\n/g, ',').split(','));
          len = files.length;
          if (len > 0) {
            for (i = 0; i < len; i += 1) {
              if (path.extname(files[i]).match(/\.(js)$/)) {
                jsFilesToLint.push(files[i]);
              }
            }
          }
          callback(null, jsFilesToLint);
        } else {
          callback(1);
        }
      });
    },

    function (jsFilesToLint, callback) {
      _prepareCommandsToDumpStagedContent(jsFilesToLint, function (err, cmds) {
        callback(err, cmds);
      });
    },
  ], function (err, commands) {
    if (commands) {
      async.parallel(commands, function (error) {
        if (!error) {
          if (_lintStagedFiles(jsHintErrorsLog, tmpJsDir)) {
            process.exit(0);
          } else {
            process.exit(1);
          }
        }
      });
    }
  });

};

/**
 * Checking node script parameters and starting the main method.
 */
if (process.argv && process.argv.length > 2) {
  run({
    tmpDir: path.join(__dirname, 'tmpjs'),
    logs: path.resolve(process.argv[2])
  });
}
