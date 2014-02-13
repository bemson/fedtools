#!/usr/bin/env node

/*jshint node:true, unused:true*/

var
  Salt = require('salt'),
  fs = require('fs'),
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

var commandSrc = {
  _in: function () {
    log.echo();
  }
};

var master = new Salt({

  // destroy these on exit
  _data: {
    // default key/values
    err: 0
  },

  // exit when done navigating
  _tail: '..//',

  // redirect to "//command/run/"
  _on: 'command/run',

  //command/
  command: {

    // destroys these on exit
    _data: ['program', 'stdin'],

    //command/parse/
    parse: {

      // dont skip me
      _over: '@self',

      _in: function () {

        var data = this.data,
          stdin = require('optimist')
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

        data.stdin = stdin;
        data.program = stdin.argv;
        // console.log(data.program);
        // this.get(0);
      },

      _on: function () {
        var salt = this,
          program = salt.data.program;

        // route options from lowest to highest priority
        // this is because `.go()` *prepends* navigation targets

        if (program.boring) {
          salt.go('option/boring');
        }

        if (program.remote || program.r) {
          salt.go('option/remote');
        }

        if (program.debug) {
          salt.go('option/debug');
        }

        if (program.help) {
          salt.go('option/help');
        }

        if (program.version || program.V) {
          salt.go('option/version');
        }

      },

      //command/parse/option/
      option: {

        //command/parse/option/help/
        help: {

          // clear existing waypoints and set new navigation destination
          _in: '>@self',

          // redirect to command/help
          _on: '//command/help'

        },

        //command/parse/option/version/
        version: {

          // use this state as a template
          _import: '//command/parse/option/help/',

          _on: function () {
            console.log(pkgVersion);
          }

        },

        //command/parse/option/boring/
        boring: function () {
          log.setBoring();
        },

        //command/parse/option/debug/
        debug: function () {
          debug = true;
        },

        //command/parse/option/remote/
        remote: function () {
          remote = true;
          log.setRemote();
        }

      }

    },

    //command/run/
    run: {

      // make local root
      _root: true,

      _on: function () {
        var salt = this,
          program = salt.data.program,
          command = program._.length < 2 && program._[0];

        if (salt.query(command)) {

          // run (known) command
          salt.go(command);

        } else {

          // else show help
          salt.go('../help');

        }
      },

      //command/run/app-flow
      'app-flow': {

        // use this object as a branch template
        _import: commandSrc,

        _on: function () {
          var salt = this;

          // pass callback that sends the result to "//command/result/" 
          app.run(app.TYPE_FLOW, salt.callbacks('../result'));

          // wait for callback, since this is asyncronous
          salt.wait();
        }

      },

      //command/run/af/
      af: {

        // redirects to previous sibling
        _on: '@previous'

      },

      //command/run/app-init/
      'app-init': {

        // use this object as a branch template
        _import: commandSrc,

        _on: function () {
          var salt = this;

          utilities.timeTracker('start');

          // pass callback that sends the result to "//command/result/" 
          app.run(app.TYPE_APP, salt.callbacks('../result'));

          // wait for callback, since this is asyncronous
          salt.wait();
        },

        _out: function () {
          var err = this.args[0];
          if (err !== -1) {
            utilities.timeTracker('stop');
          }
        }
      },

      //command/run/ai/
      // short-form for importing //command/run/af/
      ai: '//command/run/af/'

    },

    //commmand/help/
    help: {
      _in: function () {
        console.log(this.data.stdin.help());
      },
      _on: function () {
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
    },

    //command/result/
    result: function (err) {
      if (err && err !== -1) {
        log.echo(err);
      }
    }

  },

  _out: function () {
    var code = this.data.err || 0;
    process.exit(code);
  }
});

master.go(1);