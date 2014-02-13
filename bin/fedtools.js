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
  },
  commandList = Object.keys(fedToolsCommands),
  baseCommandBranch = {

    // defines local root for this branch
    _root: true,

    // discard these keys on exit
    _data: {
      // default key/values
      logTime: true,
      exitCode: 0,
      isAsync: true
    },

    _in: function () {
      log.echo();
    },

    _on: function () {
      var salt = this;
      // invoke action and pass callback
      salt.get('action', salt.callbacks('/result'));
    },

    // will compile as "//run/command/<command-name>/action/"
    action: {

      _in: function () {
        utilities.timeTracker('start');
      },

      // "_on" will come from the branch copying this template

      _out: function () {
        var salt = this;

        if (salt.data.isAsync) {
          // don't exit until directed elsewhere
          // like the callback, passed to "action"
          this.wait();
        }
      }

    },

    // will compile as "//run/command/<command-name>/result/"
    result: function (err) {
      var data = this.data;

      if (err && err !== -1) {
        log.echo(err);
      }

      if (data.logTime) {
        utilities.timeTracker('stop');
      }

      // copy action-result as error code
      data.err = data.exitCode;

      log.echo();
    }

   };

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

var master = new Salt({

  // destroy these on exit
  _data: [
    'program',
    'stdin',
    'pkg',
    // default key/values
    {
      err: 0,
      remote: false,
      debug: false
    }
  ],

  _in: function () {
    var packageFileJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

    // set default pkg value
    this.data.pkg = {
      version: packageFileJson.version,
      config: packageFileJson.config,
      name: packageFileJson.name
    };
  },

  // route to "//run/command/"
  _on: 'run/command',

  // exit when done navigating
  _tail: '..//',

  //parse/
  parse: {

    // this captures when salt bypasses this state
    _over: '@self',

    _in: function () {

      var data = this.data,
        stdin = require('optimist')
          .usage('\nUsage: ' + data.pkg.name + ' [options] ' + commandList.join('|'))
          .alias('h', 'help')
          .describe('h', 'output usage information')
          .alias('v', 'version')
          .alias('V', 'version')
          // .describe('v', 'output the version number')
          .describe('v', 'output the version number')
          .alias('b', 'boring')
          .describe('b', 'do not use color output')
          .alias('d', 'debug')
          .describe('d', 'display extra information')
          .boolean(['b', 'd', 'V', 'v', 'h']);

      data.stdin = stdin;
      data.program = stdin.argv;

      // ensure "V" matches "v"
      data.program.V = data.program.v;
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

      if (program.version || program.V || program.v) {
        salt.go('option/version');
      }

    },

    //parse/option/
    option: {

      //parse/option/help/
      help: {

        // clear existing waypoints and set new navigation destination
        _in: '>@self',

        // route to command/help
        _on: '//run/help'

      },

      //parse/option/version/
      version: {

        // use state as a branch template
        _import: '//parse/option/help/',

        _on: function () {
          console.log(this.data.pkg.version);
        }

      },

      //parse/option/boring/
      boring: function () {
        log.setBoring();
      },

      //parse/option/debug/
      debug: function () {
        this.data.debug = true;
      },

      //parse/option/remote/
      remote: function () {
        this.data.remote = true;
        log.setRemote();
      }

    }

  },

  //run/
  run: {

    //run/command/
    command: {

      _on: function () {
        var salt = this,
          program = salt.data.program,
          cmd = program._.length < 2 && program._[0];

        // only run known command
        if (salt.query(cmd)) {
          salt.go(cmd);
        } else {
          // else show help
          salt.go('../help');
        }
      },

      //run/command/app-flow
      'app-flow': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/app-flow/action/
        action: function (done) {
          app.run(app.TYPE_FLOW, done);
        }

      },

      //run/command/af/
      af: {

        // routes to previous sibling
        _on: '@previous'

      },

      //run/command/app-init/
      'app-init': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/app-init/action/
        action: function (done) {
          app.run(app.TYPE_APP, done);
        }

      },

      //run/command/ai/
        // this short-form imports "//run/command/af/"
      ai: '//run/command/af/',

      //run/command/wria2-bump/
      'wria2-bump': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-bump/action/
        action: function (done) {
          utilities.wria2bump(this.data.debug, done);
        }

      },

      //run/command/bump/
        // this short-form imports "//run/command/af/"
      bump: '//run/command/af/',

      //run/command/wbp/
        // this short-form imports "//run/command/af/"
      wbp: '//run/command/af/',

      //run/command/wria2-selleck/
      'wria2-selleck': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-selleck/action/
        action: function (done) {
          build.run(this.data.debug, {
            type: build.TYPE_SERVER,
            server: build.SERVER_TYPE_SELLECK
          }, done);
        }

      },

      //run/command/wria2-sel/
        // this short-form imports "//run/command/af/"
      'wria2-sel': '//run/command/af/',

      //run/command/wss/
        // this short-form imports "//run/command/af/"
      wss: '//run/command/af/',

      //run/command/wria2-api/
      'wria2-api': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-api/action/
        action: function (done) {
          build.run(this.data.debug, {
            type: build.TYPE_SERVER,
            server: build.SERVER_TYPE_YUIDOC
          }, done);
        }

      },

      //run/command/wa/
        // this short-form imports "//run/command/af/"
      wa: '//run/command/af/',

      //run/command/wria2-soy
      'wria2-soy': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-soy/action/
        action: function(done) {
          build.run(this.data.debug, {
            cwd: process.cwd(),
            prompt: true,
            type: build.TYPE_SOY
          }, done);
        }
      },

      //run/command/ws/
        // this short-form imports "//run/command/af/"
      ws: '//run/command/af/',

      //run/command/wria2-watch
      'wria2-watch': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-watch/action/
        action: function(done) {
          build.run(this.data.debug, {
            cwd: process.cwd(),
            prompt: true,
            type: build.TYPE_SOY
          }, done);
        }

      },

      //run/command/ww/
        // this short-form imports "//run/command/af/"
      ww: '//run/command/af/',

      //run/command/wria2-war
      'wria2-war': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-war/action/
        action: function(done) {
          var data = this.data,
            program = data.program;

          build.run(data.debug, {
            remote: data.remote,
            username: program.u,
            useremail: program.e,
            wriaBranch: program.w,
            yuiBranch: program.y,
            statusJob: program.S,
            addJob: program.A,
            removeJob: program.R,
            processJob: program.P,
            pkgConfig: data.pkg.config,
            cwd: process.cwd(),
            prompt: true,
            type: build.TYPE_WAR
          }, done);
        },

        //run/command/wria2-war/result
        result: {

          _in: function () {
            var salt = this,
              data = salt.data,
              errArg = salt.args[0];

            if (errArg && errArg !== -1) {
              // set exit code
              data.exitCode = 127;
            }
            if (!data.remote && !errArg) {
              // ignore timer since we've errored out
              data.ignoreTimer = true;
            }
          }

        }

      },

      //run/command/war/
        // this short-form imports "//run/command/af/"
      war: '//run/command/af/',

      //run/command/wria2-build/
      'wria2-build': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-build/action/
        action: function (done) {
          build.run(this.data.debug, {
            cwd: process.cwd(),
            prompt: true,
            type: build.TYPE_BUILD
          }, done);
        }

      },

      //run/command/wb/
        // this short-form imports "//run/command/af/"
      wb: '//run/command/af/',

      //run/command/wria2-init
      'wria2-init': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-init/action/
        action: function (done) {
          var data = this.data;

          require('../lib/wria2-bootstrap').run(data.debug, data.pkg.config, done);
        }

      },

      //run/command/wi/
        // this short-form imports "//run/command/af/"
      wi: '//run/command/af/',

      //run/command/wria2-yui3
      'wria2-yui3': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-yui3/action/
        action: function (done) {
          var data = this.data;

          require('../lib/yui3-utils').run(data.debug, data.pkg.config, {}, done);
        }

      },

      //run/command/wy/
        // this short-form imports "//run/command/af/"
      wy: '//run/command/af/',

      //run/command/wria2-mod
      'wria2-mod': {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wria2-mod/action/
        action: function (done) {
          var data = this.data;

          require('../lib/yui3-utils').run(data.debug, data.pkg.config, {}, done);
        }

      },

      //run/command/wm/
        // this short-form imports "//run/command/af/"
      wm: '//run/command/af/',

      //run/command/wt
      wt: {

        // use object as a branch template
        _import: baseCommandBranch,

        //run/command/wt/action/
        action: function () {
          log.blue('==> this is a b-b-blue test ');
          log.yellow('==> this is a y-y-yellow test ');

          // flag that this command is not blocking
          this.data.isAsync = false;
        }

      }

    },

    //run/help/
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

    }

  },

  _out: function () {
    var code = this.data.err || 0;
    process.exit(code);
  }

});

// run master program
master.go('@program');