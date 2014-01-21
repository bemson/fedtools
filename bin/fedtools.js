#!/usr/bin/env node

/*jshint node:true, unused:true*/

var program = require('commander'),
  fs = require('fs'),
  path = require('path'),
  log = require('fedtools-logs'),

  build = require('../lib/wria2-build'),
  app = require('../lib/app-bootstrap'),
  utilities = require('../lib/utilities'),

  debug = false,
  remote = false,
  command = '',
  packageFileJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')),
  pkgVersion = packageFileJson.version,
  pkgConfig = packageFileJson.config,

  commandList = [],
  fedToolsCommands = {
    'af': {
      'full': 'app-flow',
      'description': 'Generates a single webapp flow skeleton from scratch.'
    },
    'ai': {
      'full': 'app-init',
      'description': 'Generates a full webapp skeleton from scratch.'
    },
    'war': {
      'full': 'wria2-war',
      'description': 'Generate a wria2 WAR file ready to be deployed to a CI server or to your own JSP container.'
    },
    'wss': {
      'full': 'wria2-sel',
      'description': 'Start Selleck to serve example pages for the wria2 framework.'
    },
    'wa': {
      'full': 'wria2-api',
      'description': 'Start YUIDoc server to view API docs of the wria2 framework.'
    },
    'ws': {
      'full': 'wria2-soy',
      'description': 'Build all the Soy templates.'
    },
    'wi': {
      'full': 'wria2-init',
      'description': 'Bootstrap a local wria2 git repository (clone, hooks, synchornize with yui3, etc.)'
    },
    'wb': {
      'full': 'wria2-build',
      'description': 'Run a full wria2 build or a single component build depending on the current path.'
    },
    'ww': {
      'full': 'wria2-watch',
      'description': 'Watch and compile a full wria2 source tree or a single component depending on the current path.'
    },
    'wy': {
      'full': 'wria2-yui3',
      'description': 'Synchronize a local repository with the latest YUI3 code (provided by wria).'
    },
    'wm': {
      'full': 'wria2-mod',
      'description': 'Create a new module (skeleton code, including unit tests and documentation).'
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
  .option('-r, --remote', 'flag to indicate if running remotely')
  .option('-e, --email [email]', 'email - if provided, will not be prompted')
  .option('-u, --username [name]', 'username - if provided, will not be prompted')
  .option('-w, --wria-branch [branch]', 'branch - if provided, will not be prompted')
  .option('-y, --yui-branch [branch]', 'wf2-yui3 branch - if provided, will not be prompted')
  .option('-S, --status-job', 'if remote, print the status of the jenkins WAR jobs')
  .option('-A, --add-job', 'if remote, add a jenkins WAR job to the queue')
  .option('-R, --remove-job', 'if remote, remove a jenkins WAR job from the queue')
  .option('-P, --process-job', 'if remote, execute the oldest WAR job from the queue');


program.on('--help', function () {
  console.log('  Parameters:');

  var cmdtmp, cmdtmplen, cmdt, cmdl, cmdd, cmddlen, i, j,
    len = commandList.length,
    descArray, descArrayLen,
    buffer = '',
    CMD_PRE_BUFFER = '    ',
    CMD_MAX_LEN = 22,
    CMD_DESC_MAX = 50;
  console.log(new Array(CMD_MAX_LEN + CMD_DESC_MAX + 1).join('─'));

  for (i = 0; i < len; i += 1) {
    cmdt = commandList[i];
    cmdl = fedToolsCommands[commandList[i]].full;
    cmdd = fedToolsCommands[commandList[i]].description;

    cmdtmp = CMD_PRE_BUFFER + cmdt + ' (' + cmdl + ')';
    cmdtmplen = cmdtmp.length;
    cmddlen = cmdd.length;

    buffer = cmdtmp + new Array(CMD_MAX_LEN - cmdtmplen + 1).join(' ');
    descArray = utilities.wordWrap(cmdd, CMD_DESC_MAX);

    console.log(log.strToColor('cyan', buffer) + descArray[0]);
    descArrayLen = descArray.length;
    for (j = 1; j < descArrayLen; j += 1) {
      console.log(new Array(CMD_MAX_LEN + 1).join(' ') + descArray[j]);
    }
    console.log(new Array(CMD_MAX_LEN + CMD_DESC_MAX + 1).join('─'));
  }
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

if (program.remote) {
  remote = true;
  log.setRemote();
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
case 'app-flow':
case 'af': // hidden menu
  log.echo();
  app.run(app.TYPE_FLOW, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
  });
  break;

case 'app-init':
case 'ai': // hidden menu
  utilities.timeTracker('start');
  log.echo();
  app.run(app.TYPE_APP, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
    if (err !== -1) {
      utilities.timeTracker('stop');
    }
  });
  break;

case 'wria2-bump':
case 'bump':
case 'wbp': // hidden menu
  log.echo();
  utilities.wria2bump(program.debug, function () {});
  break;

case 'wria2-selleck':
case 'wria2-sel':
case 'wss': // hidden menu
  log.echo();
  build.run(program.debug, {
    type: build.TYPE_SERVER,
    server: build.SERVER_TYPE_SELLECK
  }, function () {});
  break;

case 'wria2-api':
case 'wa': // hidden menu
  log.echo();
  build.run(program.debug, {
    type: build.TYPE_SERVER,
    server: build.SERVER_TYPE_YUIDOC
  }, function () {});
  break;

case 'wria2-soy':
case 'ws': // hidden menu
  log.echo();
  build.run(program.debug, {
    cwd: process.cwd(),
    prompt: true,
    type: build.TYPE_SOY
  }, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
  });
  break;

case 'wria2-watch':
case 'ww': // hidden menu
  log.echo();
  build.run(program.debug, {
    cwd: process.cwd(),
    prompt: true,
    type: build.TYPE_WATCH
  }, function (err) {
    if (err && err !== -1) {
      log.echo(err);
    }
  });
  break;

case 'wria2-war':
case 'war': // hidden menu
  utilities.timeTracker('start');
  log.echo();
  build.run(program.debug, {
    remote: remote,
    username: program.username,
    useremail: program.email,
    wriaBranch: program.wriaBranch,
    yuiBranch: program.yuiBranch,
    statusJob: program.statusJob,
    addJob: program.addJob,
    removeJob: program.removeJob,
    processJob: program.processJob,
    pkgConfig: pkgConfig,
    cwd: process.cwd(),
    prompt: true,
    type: build.TYPE_WAR
  }, function (err) {
    if (err && err !== -1) {
      log.echo(err);
      process.exit(127);
    }
    if (!remote) {
      if (!err) {
        utilities.timeTracker('stop');
      }
      log.echo();
    }
  });
  break;

case 'wria2-build':
case 'wb': // hidden menu
  utilities.timeTracker('start');
  log.echo();
  build.run(program.debug, {
    cwd: process.cwd(),
    prompt: true,
    type: build.TYPE_BUILD
  }, function (err) {
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
case 'wi': // hidden menu
  log.echo();
  require('../lib/wria2-bootstrap').run(program.debug, pkgConfig, function (err) {
    if (err) {
      log.error(err);
    }
    log.echo();
  });
  break;

case 'wria2-yui3':
case 'wy': // hidden menu
  log.echo();
  require('../lib/yui3-utils').run(program.debug, pkgConfig, {}, function (err) {
    if (err) {
      log.error(err);
    }
    log.echo();
  });
  break;

case 'wria2-mod':
case 'wm': // hidden menu
  log.echo();
  require('../lib/wria2-modules').run(function () {});
  break;

  // case 'test':
case 'wt':
  log.blue('==> this is a b-b-blue test ');
  log.yellow('==> this is a y-y-yellow test ');

  break;

default:
  program.help();
  break;
}
