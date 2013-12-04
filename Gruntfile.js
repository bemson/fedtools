/*jshint node:true */

module.exports = function (grunt) {

  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: ['./tmp/*'],

    curl: {
      custom: {
        src: [{
          url: 'http://registry.npmjs.org/<%=pkg.name%>/-/<%=pkg.name%>-<%=pkg.version%>.tgz',
          proxy: 'http://proxy.wellsfargo.com'
        }],
        dest: './tmp/registry-<%=pkg.name%>-<%=pkg.version%>.tgz'
      }
    },

    copy: {
      main: {
        files: [{
          src: '<%=pkg.name%>-<%=pkg.version%>.tgz',
          dest: 'tmp/local-<%=pkg.name%>-<%=pkg.version%>.tgz'
        }]
      }
    },

    mkdir: {
      all: {
        options: {
          create: ['tmp/local', 'tmp/registry']
        },
      },
    },

    release: {
      options: {
        bump: true,
        add: true,
        commit: true,
        tag: true,
        push: true,
        pushTags: true,
        npm: true
      }
    }
  });

  // load plugins
  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-curl');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mkdir');

  // register running tasks
  grunt.registerTask('default', ['help']);
  grunt.registerTask('publish', ['release', 'check']);

  grunt.registerTask('pack', 'Create package', function () {
    var done = this.async();
    grunt.util.spawn({
      cmd: 'npm',
      args: ['pack']
    }, function (err) {
      done(err);
    });
  });

  grunt.registerTask('pack-remove', 'Remove package', function () {
    var version = grunt.config.get('pkg').version,
      name = grunt.config.get('pkg').name;
    grunt.file.delete(name + '-' + version + '.tgz');
  });

  grunt.registerTask('untar', 'Untar packages', function () {
    var done = this.async(),
      version = grunt.config.get('pkg').version,
      name = grunt.config.get('pkg').name,
      localName = 'local-' + name + '-' + version + '.tgz',
      regName = 'registry-' + name + '-' + version + '.tgz';

    grunt.util.spawn({
      cmd: 'tar',
      args: ['xzf', regName, '-C', 'registry'],
      opts: {
        cwd: 'tmp'
      }
    }, function () {
      grunt.util.spawn({
        cmd: 'tar',
        args: ['xzf', localName, '-C', 'local'],
        opts: {
          cwd: 'tmp'
        }
      }, function (err) {
        done(err);
      });

    });
  });

  grunt.registerTask('diffd', 'Runs a diffd', function () {
    var done = this.async();
    grunt.util.spawn({
      cmd: 'diff',
      args: ['-b', '-q', '-r', 'local', 'registry'],
      opts: {
        cwd: 'tmp'
      }
    }, function (err, data) {
      if (data.stdout) {
        console.log('\n', data.stdout);
        done();
      } else {
        done(err);
      }
    });
  });

  // need to check the release
  grunt.registerTask('check', 'Check the release validity', function () {
    grunt.task.run('clean');
    grunt.task.run('mkdir');
    grunt.task.run('curl');
    grunt.task.run('pack');
    grunt.task.run('copy');
    grunt.task.run('pack-remove');
    grunt.task.run('untar');
    grunt.task.run('diffd');
  });

  grunt.registerTask('help', 'Display help usage', function () {
    console.log();
    console.log('Type "grunt publish" to:');

    console.log(' - bump the version in package.json file.');
    console.log(' - stage the package.json file\'s change.');
    console.log(' - commit that change.');
    console.log(' - create a new git tag for the release.');
    console.log(' - push the changes out to github.');
    console.log(' - push the new tag out to github.');
    console.log(' - publish the new version to npm.');
    console.log(' - check if the newly published package is valid.');
  });
};
