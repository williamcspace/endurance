'use strict';

var gulp          = require('gulp');
var util          = require('util');
var child_process = require('child_process');
var eslint        = require('gulp-eslint');

gulp.task('build', function () {
  print('should i make a build script?');
  return null;
});

gulp.task('test', function () {
  var proc = child_process.spawn('node', ['test/test.js']);
  proc.stderr.on('data', function (data) {
    process.stderr.write(data.toString());
  });

  proc.stdout.on('data', function (data) {
    util.log(data.toString());
  });

  proc.stdout.on('exit', function (code) {
    if (code != 0) {
      process.exit(code);
    }
  });
});

gulp.task('lint', function () {
  return gulp.src(['app/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});
