//dependencies
var gulp  = require('gulp');
var del = require('del');
var ts = require('gulp-typescript');

var tsConfig = require('./tsconfig.json');

//Typescript Config;
var tsProject = ts.createProject('tsconfig.json');

//clean the dist folder
gulp.task('clean:app', function() {
  return del(['app']);
});

//compile app typescript files
gulp.task('compile:app', function() {
  return tsProject.src('src/**/*.ts')
    .pipe(ts(tsProject))
    .pipe(gulp.dest('app'))
});

gulp.task('build', ['clean:app', 'compile:app']);
