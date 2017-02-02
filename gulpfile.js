/* jshint node: true */
'use strict';

// Import gulp
var gulp = require ('gulp');

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
// Use --jshint=stylish
var argv = minimist (process.argv.slice (2), {'string': 'jshint'});

// Set true when using the long running 'gulp serve' command
var isWatching = false;

/**
 * Default task (run jshint and build the index.html)
 */
gulp.task ('default', ['jshint', 'index']);

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
gulp.task ('jshint', function () {
   return gulp.src ([
      './gulpfile.js',
      './src/**/*.js',
      './res/**/*.js',
      './config.js',
      './main.js'
   ])
   .pipe (cached ('jshint'))        // cache in memory
   .pipe (_jshint (argv.jshint))    // pass in command line arg for 'stylish'
   .pipe (_livereload ());          // pass to livereload
});

/**
 * Serve up the index.html and the rest of the project .js files (for debug running).
 * This is our version of 'cocos run -p web', but with livereload, and jshinting.
 */
gulp.task ('serve', ['watch']);

gulp.task ('static', serve ({
   port: 8000,
   root: ['./.tmp', '.']
}));

gulp.task ('watch', ['static', 'default'], function () {
   isWatching = true;

   livereload ({ start: true });

   gulp.watch (['./main.js', '**/*.js'], { interval: 750 }, ['jshint']).on ('change', function (evt) {
      if (evt.type !== 'changed') {
         gulp.start ('index');         // wish I could remember why I needed to do this!
      }
   });

   gulp.watch ('./index.html', ['index']);
});

/**
 * Jshint with either default or stylish reporter (default works better in SlickEdit
 * whereas stylish better in build logs)
 */
function _jshint (reporter) {
   var jshintfile = './.jshintrc';
   var jshintSettings = JSON.parse (fs.readFileSync (jshintfile, 'utf8'));

   return lazypipe ()
      .pipe (jshint, jshintSettings)
      .pipe (jshint.reporter, reporter === 'stylish' ? stylish : 'default') ();
}

/**
 * Livereload (or noop if not run by watch)
 */
function _livereload () {
   return lazypipe ()
      .pipe (isWatching ? livereload : gutil.noop) ();
}
