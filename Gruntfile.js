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
  grunt.registerTask('default', ['release']);
};
