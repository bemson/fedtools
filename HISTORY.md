
Release 0.0.11
--------------
* [ Arno V ] Updating release task

Release 0.0.12
--------------
* [ Arno V ] Enabling release task… time to try it :)

Release 0.0.13
--------------
* [ Arno V ] wria2-mod: name 'wf-xyz' is equivalent to 'xyz'
* [ Arno V ] Adding wt2 creation

Release 0.0.14
--------------
* [ Arno V ] Adding comments to the generated js file

Release 0.0.15
--------------
* [ Arno V ] Extra comment in the js template
* [ Arno V ] Adding the tree display for wt2 module creation

Release 0.0.16
--------------
* [ Arno V ] Adding extra info on how to start selleck on bootstrap
* [ Arno V ] removing dead code
* [ Arno V ] Adding the combo option to the bootstrap flow
* [ Arno V ] Adding the option to bypass build confirmation, as well as to update the shifter.json if needed (for combo or not)
* [ Arno V ] Using my shifter until the gear/gear-lib dependency is fixed
* [ Arno V ] If command is too long, display only the binary in the command execution
* [ Arno V ] Addinf shifter and yogi to local dependencies
* [ Arno Versini ] work in progress
* [ Arno V ] work in progress
* [ Arno V ] Add option to build from another path
* [ Arno V ] Better comments for the ATTRS property

Release 0.0.17
--------------
* [ Arno V ] extra callback call removed

Release 0.0.18
--------------
* [ Arno V ] Fix selleck log for windows

Release 0.0.19
--------------
* [ Arno V ] shifter is fixed, no need to use my own version
* [ Arno V ] Externalize yui3utils variables

Release 0.0.20
--------------
* [ Arno V ] Adding 'watch' option

Release 0.0.21
--------------
* [ Arno V ] rewording at the end of init

Release 0.0.22
--------------
* [ Arno V ] Fixing automatic build confirmation
* [ Arno V ] Better error handling of invalid YUI3 branch
* [ Arno V ] Adding fetch to git checkout helper

Release 0.0.24
--------------
* [ Arno V ] Adding option to enter a 'gitlab id' for the git repo
* [ Arno V ] Fixing missing path for full build

Release 0.0.25
--------------
* [ Arno V ] Adding remote pointing to upstream during bootstrap

Release 0.0.26
--------------
* [ Arno V ] Adding nom install in build dir on init, even if not built

Release 0.0.27
--------------
* [ Arno V ] replacing "rm -rf" and "mkdir -p" with native nodejs packages

Release 0.0.28
--------------
* [ Arno Versini ] For a full build, always prompt for the combo loader flag

Release 0.0.29
--------------
* [ Arno V ] Reorganization of the help results for narrower terminals (I'm looking at you Windows)
* [ Arno V ] Adding 2 new utilities: isWindows and wordWrap
* [ Arno V ] Reducing the max length of a status message to accommodate windows shells (much narrower and not easy to resize)
* [ Arno V ] More explicit message for commit failure on empty JIRA ticket

Release 0.0.30
--------------
* [ Arno V ] Externalizing fedtools-logs

Release 0.0.31
--------------
* [ Arno V ] Adding soy templates compilation

Release 0.0.32
--------------
* [ Arno V ] removing old commands.js
* [ Arno V ] moving to fedtools-commands
* [ Arno V ] cleanup
* [ Arno V ] using fedtools-commands
* [ Arno V ] adding dependency to fedtools-commands
* [ Arno V ] move to fedtools-commands

Release 0.0.34
--------------
* [ Arno V ] Adding 'wss' or 'wria2-selleck' to start Selleck to server example pages
* [ Arno V ] Adding the possibility to start a server (selleck is the first one)

Release 0.0.35
--------------
* [ Arno V ] Cannot start selleck if path is not wria2 path

Release 0.0.36
--------------
* [ Arno V ] Adding dev grunt task to validate the published package

Release 0.0.37
--------------
* [ Arno V ] Adding color to the help page
* [ Arno V ] add error message if check fails
* [ Arno V ] dev tools update

Release 0.0.38
--------------
* [ Arno V ] moving upstream configuration step before yui3 syncing (just in case the yui3 part fails)

Release 0.0.40
--------------
* [ Arno V ] moving wria2 module template to own directory
* [ Arno V ] Moar explicit warning

Release 0.0.42
--------------
* [ Gerard K. Cohen ] Issue #9: Add 'base-build' to meta.json requires
* [ Venkataguru Mitta ] #7 - Add a commad to View API Docs

Release 0.0.44
--------------
* [ Arno V ] Minor content update
* [ Arno V ] Removing old unused files
* [ Arno V ] Grunt release check task: proxy or no proxy option
* [ Arno V ] Adding node:true to jshint options for git hooks
* [ Arno V ] Externalizing 'installLocalNpmPackages' to utilities
* [ Arno V ] Refining help page a little bit

##Release 0.0.46 ~ Dec 10 2013 12:10
* [ Arno V ] Adding commit history grunt task
* [ Arno V ] &quot;Updating HISTORY&quot;
* [ Arno V ] work in progress
* [ Arno V ] Adding HISTORY.md

##Release 0.0.47 ~ Dec 10 2013 12:24
* [ Arno V ] Fix history versioning with the latest tag
* [ Arno V ] Fixing history version

##Release 0.0.48 ~ Dec 10 2013 16:36
* [ Arno V ] Bundling shifter and yogi to try to ease the installation part of fedtools
* [ Arno V ] fix typo

##Release 0.0.49 ~ Dec 10 2013 21:17
* [ Arno V ] fixing script to detect shifter and yogi
* [ Arno V ] missing script to check for yogi&#x2F;shifter
* [ Arno V ] Removing shifter and yogi dependency - just error message if not installed

##Release 0.0.50 ~ Dec 10 2013 21:22
* [ Arno V ] Cleaning up package dependencies

##Release 0.0.51 ~ Dec 10 2013 21:30
* [ Arno V ] Removing debug from Gruntfile (commit: 24056fe)
* [ Arno V ] Adding abbreviated commit hash to HISTORY logs (commit: dbaab82)

##Release 0.0.52 ~ Dec 10 2013 21:33
* [ Arno V ] using full commit hash so that Github is happy - commit: 3e802df3ae61e6a3ade450db5f21bb10efc8a749

##Release 0.0.53 ~ Dec 14 2013 09:50
* [ Arno V ] Temporarily disabling WAR generation for Windows
* [ Arno V ] Using os specific tmp directory
* [ Arno V ] ignoring sublime project files
* [ Arno V ] making windows happy (gawk vs awk and \r\n vs \n)
* [ Arno V ] Better wording for WAR build
* [ Arno V ] Adding WAR generation as a new fedtools command
* [ Venkataguru Mitta ] Fixing issue#14
* [ Arno V ] Adding name and version to package to fix issue #15
* [ Arno V ] Removing hash from HISTORY... doesn&#39;t show up in github
* [ Arno V ] Update HISTORY.md

##Release 0.0.54 ~ Dec 14 2013 10:17
* [ Arno V ] Disabling WAR génération completely (wria2 repo is not ready)

##Release 0.0.56 ~ Dec 16 2013 01:05
* [ Arno V ] Updating README to talk about module creation
* [ Arno V ] Adding gitignore file per created module
* [ Arno V ] Fix module creation if not wria2 repo
* [ Arno V ] Fixing module creation issue #18
* [ Arno V ] If combo is disabled, default is to continue disabled

##Release 0.0.58 ~ Dec 18 2013 22:44
* [ Arno V ] Minor typo
* [ Arno V ] Enabling WAR for linux&#x2F;Mac
* [ Arno V ] Using &#39;utilities.getTemporaryDir()&#39;
* [ Arno V ] Creating API to create temporary dir for fedtools
* [ Arno V ] typo
* [ Arno V ] Adding YUI3 clone to the WAR creation process
* [ Arno V ] Optimizing YUI3 clone (shallow copy instead of full)
* [ Arno V ] Fixing git clone helper: trailing space was breaking the parsing
* [ Arno V ] Refactoring WAR creation
* [ Arno V ] Adding the option to have no default value from a prompt by passing undefined as the default value!
* [ Arno V ] Adding extra options to git clone
* [ Arno V ] Default branch is now &#39;develop&#39;

##Release 0.0.60 ~ Dec 19 2013 09:31
* [ Arno V ] Enabling WAR creation for poor windows users
* [ Arno V ] Making windows commands happy

##Release 0.0.62 ~ Dec 19 2013 09:49
* [ Arno V ] Fix for Mac&#x2F;Linux (bleed from windows previous fix…)

##Release 0.0.63 ~ Dec 20 2013 15:35
* [ Arno V ] Adding utilities.wria2bump to increase the version of the framework

##Release 0.0.65 ~ Jan 01 2014 19:35
* [ Arno V ] Better wording at the end of a WAR build
* [ Arno V ] Fixing WAR build: new war location
* [ Arno V ] Some cleanup
* [ Arno V ] Add a new git helper command: getCurrent SHA
* [ Arno V ] WAR: asking for branch and yui3 branch
* [ Arno V ] work in progress: trying to externalize wf2 build from maven
* [ Arno V ] WAR: asking for branch and yui3 branch
* [ Arno V ] work in progress: trying to externalize wf2 build from maven

##Release 0.0.67 ~ Jan 05 2014 15:10
* [ Arno V ] webapp: adding an extended flow to showcase containers and grids
* [ Arno V ] webapp: adding a few default css rules
* [ Arno V ] webapp: add scss to grunt watch
* [ Arno V ] webapp: grunt watch update
* [ Arno V ] webapp: renaming pagex.js into modulex.js
* [ Arno V ] webapp: some cleanup for flow creation
* [ Arno V ] webapp: preventing creation of flow named &#39;common&#39;
* [ Arno V ] webapp: adding custom CSS support
* [ Arno V ] webapp: change &lt;head title&gt; to name-version of app
* [ Arno V ] webapp: better final wording during skeleton bootstrap
* [ Arno V ] webapp: moving common js script from common template to flows (that need it)
* [ Arno V ] webapp: grunt-minifier more generic
* [ Arno V ] Adding a special option for &#39;fedtools bump&#39;: build or combo
* [ Arno V ] Fixing fedtools bump (invalid path option)
* [ Arno V ] Fixing json file update (to keep indentation instead of flattening the file)
* [ Arno V ] webapp: fixing utf8 trailing character
* [ Arno V ] webapp: including &#39;mvn clean&#39; to bootstrap
* [ Arno V ] webapp: renaming default first flow to &#39;home&#39;
* [ Arno V ] webapp: adding build time information
* [ Arno V ] webapp: cleanup appnav example
* [ Arno V ] webapp: fix multiple flows minification
* [ Arno V ] webapp: fix flow dependency
* [ Arno V ] webapp: removing duplicate
* [ Arno V ] webapp: Fix existing flow detection
* [ Arno V ] webapp: removing extra page
* [ Arno V ] webapp: small cleanup
* [ Arno V ] webapp: update
* [ Arno V ] webapp work in progress
* [ Arno V ] work in progress
* [ Arno V ] First commit for webapp

##Release 0.0.68 ~ Jan 05 2014 18:54
* [ Arno V ] webapp: default tags are now 2.2.0-SNAPSHOT
* [ Arno V ] webapp: refactoring the extended flow

##Release 0.0.69 ~ Jan 07 2014 20:35
* [ Arno V ] Fixing lint errors!
* [ Arno V ] Removing obsolete script
* [ Arno V ] Making sure that shifter, yogi and maven are installed to actually run a WAR build
* [ Arno V ] Adding &#39;isAppInstalled&#39; to utilities and removing the script that was used to check yogi&#x2F;shifter at installation time. This fixes issue #19
* [ Arno V ] webapp: fedtools helper update
* [ Arno V ] webapp: adding debug js files generation at build time (on top of min)
* [ Arno V ] webapp: using fedtools-maven-plugin 0.0.3
* [ Arno V ] webapp: updating jshint and calling it from &#39;build&#39;
* [ Arno V ] webapp: i18n java side
* [ Arno V ] webapp: first pass at README.md

##Release 0.0.70 ~ Jan 10 2014 18:29
* [ Arno V ] remove test
* [ Arno V ] war: fix display issue for ... windows!
* [ Arno V ] war: do not scp on freaking windows, it doesn&#39;t work
* [ Arno V ] war: missing package dependency
* [ Arno V ] war: fix typo
* [ Arno V ] WAR: using own version of scp (using ssh2) instead of scp2 which is buggy
* [ Arno V ] WAR: cleanup
* [ Arno V ] WAR: the name of the local WAR file has changed
* [ Arno V ] WAR: sh* load of changes
* [ Arno V ] WAR: prevent remote and local build from reporting elapsed time twice
* [ Arno V ] Fix prompt of type &#39;password&#39; to prevent empty password
* [ Arno V ] war: setting remote flag
* [ Arno V ] war: update
* [ Arno V ] war: update
* [ Arno V ] war: update to use home directory if on remote
* [ Arno V ] war: still work in progress :)
* [ Arno V ] war: moar work in progress
* [ Arno V ] war: work in progress
* [ Arno V ] war: first pass at remote ssh fedtools

##Release 0.0.71 ~ Jan 17 2014 12:05
* [ Arno V ] war: Move to a queue system for windows user
