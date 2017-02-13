/* jshint node: true */
'use strict';

// Import gulp through gulp-help
var gulp = require ('gulp-help')(require ('gulp'), {hideEmpty: true, hideDepsMessage: true});

// And lots of useful plugins
var gutil = require ('gulp-util');
var cached = require ('gulp-cached');
var serve = require ('gulp-serve');
var livereload = require ('gulp-livereload');
var embedlr = require ('gulp-embedlr');
var jshint = require ('gulp-jshint');

// Stylish jshint plugin for nicer command line output
var stylish = require ('jshint-stylish');

// Filesystem (almost always needed)
var fs = require ('fs');

// Lazypipe for performance
var lazypipe = require ('lazypipe');

// Minimist for command line parsing
var minimist = require ('minimist');

// Process command line arg for enabling stylish jshint output
// Use --stylish
var argv = minimist (process.argv.slice (2), {'boolean': 'stylish'});

// Set true when using the long running 'gulp serve' command
var isWatching = false;

/**
 * Default task, show the help
 */
gulp.task ('default', ['help']);

/**
 * Generate index.html in .tmp folder, embedding the livereload script tag
 */
gulp.task ('index', function () {
   return gulp.src ('./index.html')
     .pipe (embedlr ())
     .pipe (gulp.dest ('./.tmp/'))
     .pipe (_livereload ())
   ;
});

/**
 * Run jshint on all the files
 */
gulp.task ('jshint', 'Run jshint over the source .js files', [], function () {
   return gulp.src ([
      './gulpfile.js',
      './src/**/*.js',
      './res/**/*.js',
      './config.js',
      './main.js'
   ])
   .pipe (cached ('jshint'))        // cache in memory
   .pipe (_jshint (argv.stylish))   // pass in command line arg for 'stylish'
   .pipe (_livereload ());          // pass to livereload
}, {options: {'stylish': 'Use the stylish processor for output'}});

/**
 * Serve up the index.html and the rest of the project .js files (for debug running).
 * This is our version of 'cocos run -p web', but with livereload, and jshinting.
 */
gulp.task ('serve', 'Serve the project files on port 8000, including livereload', ['watch']);

gulp.task ('static', serve ({
   port: 8000,
   root: ['./.tmp', '.']
}));

gulp.task ('watch', ['static', 'index', 'jshint'], function () {
   isWatching = true;

   livereload ({ start: true });

   gulp.watch (['./*.js', 'src/**/*.js', 'res/**/*.js'], { interval: 2000 }, ['jshint']).on ('change', function (evt) {
      if (evt.type !== 'changed') {
         gulp.start ('index');
      }
   });

   gulp.watch ('./index.html', ['index']);
});

/**
 * Jshint with either default or stylish reporter (default works better in SlickEdit
 * whereas stylish better in build logs)
 */
function _jshint (isStylish) {
   var jshintfile = './.jshintrc';
   var jshintSettings = JSON.parse (fs.readFileSync (jshintfile, 'utf8'));

   return lazypipe ()
      .pipe (jshint, jshintSettings)
      .pipe (jshint.reporter, isStylish ? stylish : 'default') ();
}

/**
 * Livereload (or noop if not run by watch)
 */
function _livereload () {
   return lazypipe ()
      .pipe (isWatching ? livereload : gutil.noop) ();
}
