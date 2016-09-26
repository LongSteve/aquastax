/* jshint node: true */
'use strict';

var fs = require ('fs');

var gulp = require ('gulp');
var gutil = require ('gulp-util');
var cached = require ('gulp-cached');

var lazypipe = require ('lazypipe');
var minimist = require ('minimist');

var stylish = require ('jshint-stylish');

var serve = require ('gulp-serve');
var livereload = require ('gulp-livereload');
var embedlr = require ('gulp-embedlr');
var jshint = require ('gulp-jshint');

var argv = minimist (process.argv.slice (2), {'string': 'jshint'});

var isWatching = false;

gulp.task ('default', ['jshint', 'index']);

gulp.task ('index', index);

function index ()
{
   return gulp.src ('./index.html')
     .pipe (embedlr ())
     .pipe (gulp.dest ('./.tmp/'))
     .pipe (_livereload ())
   ;
}

gulp.task ('jshint', function () {
   return gulp.src ([
      './gulpfile.js',
      './src/**/*.js',
      './res/**/*.js',
      './main.js'
   ])
   .pipe (cached ('jshint'))
   .pipe (_jshint (argv.jshint))
   .pipe (_livereload ());
});

gulp.task ('serve', ['watch']);

gulp.task ('static', serve ({
   port: 8000,
   root: ['./.tmp', '.']
}));

gulp.task ('watch', ['static', 'default'], function () {
   isWatching = true;

   livereload ({ start: true });

   gulp.watch (['./main.js', '**/*.js'], ['jshint']).on ('change', function (evt) {
      if (evt.type !== 'changed') {
         gulp.start ('index');
      }
   });

   gulp.watch ('./index.html', ['index']);

});

function _jshint (reporter) {
   var jshintfile = './.jshintrc';
   var jshintSettings = JSON.parse (fs.readFileSync (jshintfile, 'utf8'));

   return lazypipe ()
      .pipe (jshint, jshintSettings)
      .pipe (jshint.reporter, reporter === 'stylish' ? stylish : 'default') ();
}

function _livereload () {
   return lazypipe ()
      .pipe (isWatching ? livereload : gutil.noop) ();
}
