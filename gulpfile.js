const gulp = require("gulp");
const browserify = require("browserify");
const tsify = require("tsify");
const ts = require("gulp-typescript");
const terser = require('gulp-terser');
const sourcemaps = require("gulp-sourcemaps");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");

/**
 * Web app static files.
 */
const paths = {
  pages: ["src/*.html"],
};

/**
 * Copy static file for github-pages.
 */
gulp.task("copy-html", function () {
  return gulp.src(paths.pages).pipe(gulp.dest("docs"));
});

gulp.task(
  "default",
  gulp.series(gulp.parallel("copy-html"), function () {
    return browserify({
      standalone: 'BotScriptAI',
      basedir: ".",
      debug: true,
      entries: [
        "src/engine/index.ts"
      ],
      cache: {},
      packageCache: {},
    })
      .plugin(tsify)
      .bundle()
      .pipe(source("botscript.bundle.js"))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(terser({
        keep_fnames: true,
        mangle: false
      }))
      .pipe(sourcemaps.write("./"))
      .pipe(gulp.dest("docs"));
  })
);
