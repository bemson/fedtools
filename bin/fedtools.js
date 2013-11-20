#!/usr/bin/env node

/*jshint node:true*/

var program = require('commander'),
  fs = require('fs'),
  path = require('path'),

  bootstrap = require('../lib/wria2-bootstrap'),
  build = require('../lib/wria2-build'),
  yui3Utils = require('../lib/yui3-utils'),
  log = require('../lib/logs'),
  utilities = require('../lib/utilities'),
  yigo = require('../lib/yigo'),

  debug = false,
  command = '',
  packageFileJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')),
  pkgVersion = packageFileJson.version,
  pkgConfig = packageFileJson.config,
  binaryName = path.basename(process.argv[1]),

  commandList = [],
  fedToolsCommands = {
    'wria2-init': {
      'description': 'Bootstrap a local wria2 git repository (clone, hooks, yui3, etc.)'
    },
    'wria2-build': {
      'description': 'Run a full wria2 build or a single component build depending on the current path.'
    },
    'wria2-yui3': {
      'description': 'Synchronize a local repository with the latest YUI3 code (provided by wria).'
    },
    'wria2-mod': {
      'description': 'Create a new module (skeleton code, including unit tests and documentation)'
    }
  };

for (var prop in fedToolsCommands) {
  if (fedToolsCommands.hasOwnProperty(prop) && prop) {
    commandList.push(prop);
  }
}
commandList.sort();

program
  .version(pkgVersion)
  .usage('[options] ' + commandList.join('|'))
  .option('-b, --boring', 'do not use color output')
  .option('-d, --debug', 'display extra information')
  .option('-e, --examples', 'print out usage examples of this tool')
  .on('--help', function () {
    console.log('  Parameters:');
    console.log('');
    var i, len = commandList.length;
    for (i = 0; i < len; i += 1) {
      console.log('    ' + commandList[i] + '\t   ' +
        fedToolsCommands[commandList[i]].description);
    }
    console.log('');
    console.log('  Description:');
    console.log('');
    console.log(
      '    This script is designed to help build P17N components and to handle various other actions for FED.'
    );
    console.log('');
    console.log('');

  });

program.parse(process.argv);

/*******************/
/* Parsing options */
/*******************/
if (program.boring) {
  log.setBoring();
}

if (program.debug) {
  debug = true;
}

if (program.examples) {
  log.echo();
  log.title('EXAMPLE 1:');
  log.blue('Starts the process of cloning and bootstrapping a wria2 repository.');
  log.blue('It relies on user input though default options are always offered.');
  log.blue('Cloning can be bypassed if a valid existing repository is provided.');
  log.echo(' $ cd ~/projects');
  log.echo(' $ ' + binaryName + ' wria2-init');
  log.echo('');
  log.title('EXAMPLE 2:');
  log.blue('Starts a complete build of the framework. This command relies on the');
  log.blue('current directory. ' + binaryName + ' will detect if the current path');
  log.blue('is a valid wria2 path.');
  log.echo(' $ cd wria2git');
  log.echo(' $ ' + binaryName + ' wria2-build');
  log.echo('');
  log.title('EXAMPLE 3:');
  log.blue('Starts a build of a single component. This command relies on the');
  log.blue('current directory. ' + binaryName + ' will detect if the current path');
  log.blue('is a valid wria2 path AND a component path. It will not only run shifter');
  log.blue('for the component but also for yui and loader, to maintain dependencies.');
  log.echo(' $ cd wria2git/wf2/src/wf2-simplemenu');
  log.echo(' $ ' + binaryName + ' wria2-build');
  log.echo('');
  process.exit(0);
}

if (program.args.length !== 1) {
  program.help();
} else {
  command = program.args[0];
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
  bootstrap.run(program.debug, pkgConfig, function (err) {
    if (err) {
      log.error(err);
    }
    log.echo();
  });
  break;

case 'wria2-yui3':
  log.echo();
  yui3Utils.run(program.debug, pkgConfig, {}, function (err) {
    if (err) {
      log.error(err);
    }
    log.echo();
  });
  break;

case 'wria2-mod':
  log.echo();
  yigo.run(function () {});
  break;

case 'test':
  log.blue('==> this is a blue test');
  yigo.run(function () {
    console.log('==> done');
    // utilities.parseTree('/tmp/wria2git/wf2/src/wf2-arno',
    // '/tmp/wria2git', function (
    // tree) {
    // console.log('==> tree: ', tree);
    // });
  });
  break;

default:
  program.help();
  break;
}
