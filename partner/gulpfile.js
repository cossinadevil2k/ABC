'use strict';

const gulp = require('gulp');
const jsmin = require('gulp-jsmin');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const csso = require('gulp-csso');

gulp.task('default', ['controllers', 'css']);

/***************BACKEND***************/
gulp.task('controllers', () => {
    gulp.src('public/js/**/*.js')
        .pipe(concat('controllers.js'))
        .pipe(jsmin())
        .pipe(gulp.dest('public/dist/js'));
});

gulp.task('css', () => {
    gulp.src('public/css/*.css')
        .pipe(csso())
        .pipe(gulp.dest('public/dist/css'));
});
