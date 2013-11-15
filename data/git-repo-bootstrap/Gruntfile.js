/*jshint node:true, unused:true */

module.exports = function (grunt) {
  var glob = require('glob'),
    fs = require('fs'),
    path = require('path');

  // load all grunt tasks
  require('load-grunt-tasks')(grunt);
  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      hooks: {
        files: [{
          flatten: true,
          expand: true,
          cwd: '<%=pkg.config.srcHooksDir%>',
          src: '**',
          dest: '<%=pkg.config.dstHooksDir%>',
          filter: 'isFile'
        }]
      }
    }
  });

  // register default task
  grunt.registerTask('init', ['copy', 'chmod', 'npm-hooks']);

  // define 'chmod' task
  grunt.registerTask('chmod', 'Set hook files permissions', function () {
    var done = this.async(),
      pkg = grunt.config.get('pkg'),
      pattern = path.resolve(pkg.config.dstHooksDir) + '/*',
      files = glob.sync(pattern);

    files.forEach(function (file) {
      fs.chmodSync(file, '755');
    });
    done();
  });

  // define 'npm-hooks' task
  grunt.registerTask('npm-hooks', 'npm install hooks dependencies', function () {
    var done = this.async(),
      pkg = grunt.config.get('pkg');

    grunt.util.spawn({
      cmd: 'npm',
      args: ['install'],
      opts: {
        cwd: pkg.config.dstHooksDir
      }
    }, function (err) {
      if (err) {
        grunt.fail.fatal('Unable to run npm install ' + err);
      }
      done();
    });
  });

};
