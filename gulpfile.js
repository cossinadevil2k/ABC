var gulp = require('gulp');
var jsmin = require('gulp-jsmin');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var csso = require('gulp-csso');

gulp.task('default', ['backend-controllers', 'backend-css']);

/***************BACKEND***************/
gulp.task('backend-controllers', function(){
    gulp.src('backend/public/js/**/*.js')
        .pipe(concat('controllers.js'))
        .pipe(jsmin())
        .pipe(gulp.dest('backend/public/dist/js'));
});

gulp.task('backend-css', function(){
    gulp.src('backend/public/css/app.css')
        .pipe(csso())
        .pipe(gulp.dest('backend/public/dist/css'));
});