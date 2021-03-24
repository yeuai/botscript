const gulp = require("gulp");
const browserify = require("browserify");
const tsify = require("tsify");
const ts = require("gulp-typescript");
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const sourcemaps = require("gulp-sourcemaps");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");

/**
 * Copy static file for github-pages.
 */
gulp.task("copy-html", function () {
  return gulp.src("./demo.html")
    .pipe(rename("index.html"))
    .pipe(gulp.dest("docs"));
});

gulp.task(
  "default",
  gulp.series(gulp.parallel("copy-html"),
    function MainIfy() {
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
        .pipe(source("botscript.ai.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(terser({
          keep_fnames: true,
          mangle: false
        }))
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest("docs"));
    },
    function PluginIfy() {
      return browserify({
        standalone: 'BotScriptPlugins',
        basedir: ".",
        debug: true,
        entries: [
          "src/plugins/index.ts"
        ],
        cache: {},
        packageCache: {},
      })
        .plugin(tsify)
        .bundle()
        .pipe(source("botscript.plugins.js"))
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
