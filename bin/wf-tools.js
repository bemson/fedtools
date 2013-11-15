#!/usr/bin/env node

/*jshint node:true*/

var program = require('commander'),
  fs = require('fs'),
  path = require('path'),

  bootstrap = require('../lib/bootstrap'),
  build = require('../lib/wf2-build'),
  log = require('../lib/logs'),
  utilities = require('../lib/utilities'),

  debug = false,
  command = '',
  packageFile = path.join(__dirname, '../package.json'),
  version = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;


program
  .version(version)
  .usage('[options] wf2-init|wf2-build|wf2-solo')
  .option('-d, --debug', 'display extra information');

program.on('--help', function () {
  console.log('  Parameters:');
  console.log('');
  console.log('    wf2-init   Bootstrap a local wria2 git repository');
  console.log('    wf2-build  Run a full build of a local wria2 git repository');
  console.log('    wf2-solo   Run a build for a single component (including yui and loader)');
  console.log('');
  console.log('  Description:');
  console.log('');
  console.log('    This script is designed to help build P17N components');
  console.log('    and to handle various other actions for FED.');
  console.log('');
  console.log('  Examples:');
  console.log('');
  console.log('    $ cd wria2/');
  console.log('    $ wf-tools wf2-init');
  console.log('    $ wf-tools wf2-build');
  console.log('');
});

program.parse(process.argv);

/*******************/
/* Parsing options */
/*******************/
if (program.args.length !== 1) {
  program.help();
} else {
  command = program.args[0];
}

if (program.debug) {
  debug = true;
}

/*******************/
/* Geronimo!       */
/*******************/
switch (command) {
case 'wf2-build':
  utilities.timeTracker('start');
  log.echo();
  build.full(program.debug, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
    utilities.timeTracker('stop');
    log.echo();
  });
  break;

case 'wf2-solo':
  utilities.timeTracker('start');
  log.echo();
  build.solo(program.debug, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
    utilities.timeTracker('stop');
    log.echo();
  });
  break;

case 'wf2-init':
  log.echo();
  bootstrap.run(function (err) {
    if (err) {
      log.error(err);
    }
    log.echo();
  });
  break;

case 'test':
  utilities.getCurrentBranch(function (err, branch) {
    if (!err) {
      console.log('==> branch: ', branch);
    }
  });
  break;

default:
  program.help();
  break;
}
