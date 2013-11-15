#!/usr/bin/env node

/*jshint node:true*/

var program = require('commander'),
  fs = require('fs'),
  path = require('path'),

  bootstrap = require('../lib/wria2-bootstrap'),
  build = require('../lib/wria2-build'),
  log = require('../lib/logs'),
  utilities = require('../lib/utilities'),

  debug = false,
  command = '',
  binaryName = '',
  packageFile = path.join(__dirname, '../package.json'),
  version = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version,
  binaryName = path.basename(process.argv[1]);

program
  .version(version)
  .usage('[options] wria2-init|wria2-build|wria2-solo')
  .option('-d, --debug', 'display extra information');

program.on('--help', function () {
  console.log('  Parameters:');
  console.log('');
  console.log('    wria2-init   Bootstrap a local wria2 git repository');
  console.log('    wria2-build  Run a full build of a local wria2 git repository');
  console.log('                 or a single component build');
  console.log('');
  console.log('  Description:');
  console.log('');
  console.log('    This script is designed to help build P17N components');
  console.log('    and to handle various other actions for FED.');
  console.log('');
  console.log('  Examples:');
  console.log('');
  console.log('    $ cd wria2/');
  console.log('    $ ' + binaryName + ' wria2-init');
  console.log('    $ cd wf2/src/wf2-balloon');
  console.log('    $ ' + binaryName + ' wria2-build');
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
case 'wria2-build':
  utilities.timeTracker('start');
  log.echo();
  build.run(program.debug, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
    if (!err) {
      utilities.timeTracker('stop');
    }
    log.echo();
  });
  break;

case 'wria2-init':
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
