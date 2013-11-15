/*jshint node:true*/

var async = require('async'),
  path = require('path'),
  ncp = require('ncp').ncp,

  log = require('./logs'),
  cmd = require('./commands'),
  utilities = require('./utilities'),

  srcHooksPath = path.join(__dirname, '..', 'data', 'git-repo-bootstrap', 'git-hooks');

exports.run = function (done) {
  async.waterfall([
    function (callback) {
      // need to make sure we are located in a git repository
      utilities.isGitRepository(function (err) {
        if (err) {
          log.error('The current directory is not a git repository...');
          callback(err);
        } else {
          // need to go to the root of the git repo
          utilities.findGitRootPath(function (err, rootPath) {
            if (err) {
              log.error('Unable to find the root of the git repository! ');
              log.error(err);
              callback(err);
            } else {
              callback(null, path.join(rootPath, '.git', 'hooks'));
            }
          });
        }
      });
    },
    function (dstHooksPath, callback) {
      // need to copy git-hooks to the correct location
      log.info('Bootstrapping your git repository...');
      ncp(srcHooksPath, dstHooksPath, function (err) {
        if (err) {
          log.error(err);
          callback(err);
        } else {
          log.success('Git hooks copied successfully');
          callback(null, dstHooksPath);
        }
      });
    },
    function (dstHooksPath, callback) {
      // need to run npm install in the hooks directory
      cmd.run('npm install', {
        silent: false,
        inherit: false,
        pwd: dstHooksPath
      }, function (err) {
        if (err) {
          log.error('Unable to install npm packages in the hooks directory!');
          callback(err);
        } else {
          callback(null);
        }
      });
    }
  ], function (err) {
    if (!err) {
      log.success('Git hooks dependencies successfully installed');
      log.info('Your repository has been bootstrapped!');
    }
    done();
  });
};
