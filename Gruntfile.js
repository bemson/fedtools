/*jshint node:true */

module.exports = function (grunt) {

  // project configuration
  grunt.initConfig({

    release: {
      options: {
        bump: true,
        add: false,
        commit: false,
        tag: true,
        push: false,
        pushTags: false,
        npm: false
      }
    }

  });

  // load plugins
  grunt.loadNpmTasks('grunt-release');
  // register running tasks
  grunt.registerTask('default', ['help']);

  grunt.registerTask('help', 'Display help usage', function () {
    console.log();
    console.log('Type grunt release to:');

    console.log(' - bump the version in package.json file.');
    console.log(' - stage the package.json file\'s change.');
    console.log(' - commit that change.');
    console.log(' - create a new git tag for the release.');
    console.log(' - push the changes out to github.');
    console.log(' - push the new tag out to github.');
    console.log(' - publish the new version to npm.');
  });
};
