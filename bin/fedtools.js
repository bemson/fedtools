#!/usr/bin/env node

/*jshint node:true, unused:true*/

var fs = require('fs'),
  path = require('path'),
  log = require('fedtools-logs'),

  build = require('../lib/wria2-build'),
  app = require('../lib/app-bootstrap'),
  utilities = require('../lib/utilities'),

  program,
  argv,
  debug = false,
  remote = false,
  command = '',
  packageFileJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')),
  pkgVersion = packageFileJson.version,
  pkgConfig = packageFileJson.config,
  pkgName = packageFileJson.name,

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
    'bump': {
      'description': 'Update the version of the WF-RIA2 framework in all the files (pom.xml, shifter, etc)'
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

function showParametersHelp() {
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

    if (cmdl) {
      cmdtmp = CMD_PRE_BUFFER + cmdt + ' (' + cmdl + ')';
    } else {
      cmdtmp = CMD_PRE_BUFFER + cmdt;
    }
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
}

function displayHelp() {
  console.log(argv.help());
  showParametersHelp();
  process.exit(0);
}

argv = require('optimist')
  .usage('\nUsage: ' + pkgName + ' [options] ' + commandList.join('|'))
  .alias('h', 'help')
  .describe('h', 'output usage information')
  .alias('v', 'version')
  .describe('v', 'output the version number')
  .alias('b', 'boring')
  .describe('b', 'do not use color output')
  .alias('d', 'debug')
  .describe('d', 'display extra information')
  .boolean(['b', 'd', 'V', 'v', 'h']);

program = argv.argv;

/*******************/
/* Parsing options */
/*******************/
if (program.help) {
  displayHelp();
}

if (program.version || program.V) {
  console.log(pkgVersion);
  process.exit(0);
}

if (program.boring) {
  log.setBoring();
}

if (program.debug) {
  debug = true;
}

/**************************/
/* Parsing hidden options */
/**************************/
if (program.r || program.remote) {
  remote = true;
  log.setRemote();
}

// Other hidden options for remote action (building a WAR file).
// These options are hidden because users should not use them.
// They are only intended for the remote fedtools job that runs on
// the Jenkins server.
// -e [email]       The email where notifications should be sent
// -u [username]    The username (fork) of the repository to extract
// -w [wria-branch] The WF-RIA2 branch to build
// -y [yui-branch]  The YUI3 branch to use for the build
// -S               Prints the status of all current WAR jobs
// -A               Adds a jenkins WAR job to the queue
// -R               Removes a jenkins WAR job from the queue
// -P               Runs the oldest WAR job from the queue if no other is running

/********************/
/* Parsing comamnds */
/********************/
if (program._.length === 0 || program._.length > 1) {
  displayHelp();
} else {
  command = program._[0];
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
  utilities.wria2bump(debug, function () {});
  break;

case 'wria2-selleck':
case 'wria2-sel':
case 'wss': // hidden menu
  log.echo();
  build.run(debug, {
    type: build.TYPE_SERVER,
    server: build.SERVER_TYPE_SELLECK
  }, function () {});
  break;

case 'wria2-api':
case 'wa': // hidden menu
  log.echo();
  build.run(debug, {
    type: build.TYPE_SERVER,
    server: build.SERVER_TYPE_YUIDOC
  }, function () {});
  break;

case 'wria2-soy':
case 'ws': // hidden menu
  log.echo();
  build.run(debug, {
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
  build.run(debug, {
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
  build.run(debug, {
    remote: remote,
    username: program.u,
    useremail: program.e,
    wriaBranch: program.w,
    yuiBranch: program.y,
    statusJob: program.S,
    addJob: program.A,
    removeJob: program.R,
    processJob: program.P,
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
  build.run(debug, {
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
  require('../lib/wria2-bootstrap').run(debug, pkgConfig, function (err) {
    if (err) {
      log.error(err);
    }
    log.echo();
  });
  break;

case 'wria2-yui3':
case 'wy': // hidden menu
  log.echo();
  require('../lib/yui3-utils').run(debug, pkgConfig, {}, function (err) {
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
  displayHelp();
  break;
}
