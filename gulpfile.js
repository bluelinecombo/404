'use strict';

// =============================================================================
// Module loading
// =============================================================================

// --- General --- //
const del = require('del');

// --- Gulp general --- //
const gulp = require('gulp');
const {series, parallel} = require('gulp');
const beeper = require('beeper');
const concat = require('gulp-concat');
const plumber = require('gulp-plumber');
const insert = require('gulp-insert');
const rename = require('gulp-rename');
const rev = require('gulp-rev');

// --- CSS focused --- //
const scss = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');

// --- JS focused --- //
const uglifyjs = require('gulp-uglify-es').default;

// Aliases for improved reading
const from = gulp.src;
const to = gulp.dest;

// =============================================================================
// Asset paths
// =============================================================================

const paths = {
    resources: 'resources/assets',
    vendor: 'public/assets/vendor',
    dev: 'public/assets/dev',
    build: 'public/assets/build',
    npm: 'node_modules',
    theme: 'public/wp-content/themes/site',
    temp: 'tmp',
};

paths.bootstrap = paths.npm + '/bootstrap';

// =============================================================================
// Options
// =============================================================================
const options = {
    revision: false,

    autoprefixer: {
        cascade: false,
    },

    cssnano: {
        safe: true,
        autoprefixer: false,
        convertValues: false,
    },

    scss: {
        outputStyle: 'expanded',
        errLogToConsole: true,
        indentWidth: 4,
    },

    uglifyjs: {
        mangle: false,
    },

};

// =============================================================================
// CSS tasks
// =============================================================================

// App CSS
function buildAppCss () {
    return from([
        paths.resources + '/scss/app.scss',
    ], { sourcemaps: true})
        .pipe(plumber({
            errorHandler: errorHandler,
        }))
        .pipe(scss(options.scss))
        .pipe(autoprefixer(options.autoprefixer))
        .pipe(rename('app.css'))
        // Run through Sass again, to format the output
        // @note Enable below if a plugin destroys CSS formatting
        // .pipe(scss(options.scss))
        .pipe(to(paths.dev, {sourcemaps: '.'}));

}

// Vendor CSS
function buildVendorCss() {
    // return from([
    //     paths.npm + '/font-awesome/fonts/*',
    // ])
    //     .pipe(to(paths.vendor + '/font-awesome/fonts'));

    // return Promise.resolve();
}


// =============================================================================
// JS tasks
// =============================================================================

// App JS
function buildAppJs() {
    return from([

        // Individual app components
        paths.resources + '/js/components/*.js',

        // Main app file
        paths.resources + '/js/app.js',
    ], {sourcemaps: true})
        .pipe(plumber({
            errorHandler: errorHandler,
        }))
        .pipe(insert.append(';\n\n'))
        .pipe(concat('app.js'))
        .pipe(to(paths.dev, {sourcemaps: '.'}));
}

// Vendor JS
function buildVendorJs() {
    return from([
        // =============================================================================
        // Libraries
        // =============================================================================

        paths.npm + '/jquery/dist/jquery.js',
        // paths.npm + '/popper.js/dist/js/popper.js',

        // =============================================================================
        // Bootstrap components
        // =============================================================================

        paths.bootstrap + '/dist/js/bootstrap.bundle.js',
        // paths.bootstrap + '/js/dist/alert.js',
        // paths.bootstrap + '/js/dist/button.js',
        // paths.bootstrap + '/js/dist/carousel.js',
        // paths.bootstrap + '/js/dist/collapse.js',
        // paths.bootstrap + '/js/dist/dropdown.js',
        // paths.bootstrap + '/js/dist/modal.js',
        // paths.bootstrap + '/js/dist/popover.js',
        // paths.bootstrap + '/js/dist/scrollspy.js',
        // paths.bootstrap + '/js/dist/tab.js',
        // paths.bootstrap + '/js/dist/toast.js',
        // paths.bootstrap + '/js/dist/tooltip.js',
        // paths.bootstrap + '/js/dist/util.js',

        // =============================================================================
        // Plugins, or things which have dependencies from the above libraries
        // =============================================================================
        // paths.npm + '/jquery-validation/dist/jquery.validate.js',
        // paths.resources + '/vendor/retina.js',
        // paths.npm + '/headroom.js/dist/headroom.js',
        // paths.npm + '/headroom.js/dist/jQuery.headroom.js',

    ], {sourcemaps: true})
        .pipe(plumber({
            errorHandler: errorHandler,
        }))
        .pipe(insert.append(';\n\n'))
        .pipe(concat('vendor.js'))
        .pipe(to(paths.dev, {sourcemaps: '.'}));
}

// =============================================================================
// Release tasks
// =============================================================================

function releaseClean(done) {
    let tasks = 2;
    let completed = 0;

    let markCompleted = () => {
        completed += 1;
        if (completed >= tasks) {
            done();
        }
    };

    // If you add more delete tasks, make sure to update tasks var above
    del(paths.temp + '/build/*', {force: true}).then(markCompleted);
    del(paths.build + '/*', {force: true}).then(markCompleted);
}

function releaseBuildCss() {
    return from([
        paths.dev + '/app.css',
        paths.dev + '/vendor.css',
    ], {allowEmpty: true})
        .pipe(plumber({
            errorHandler: errorHandler,
        }))
        .pipe(rename((path) => {
            path.extname = '.min' + path.extname;
        }))
        .pipe(cssnano(options.cssnano))
        .pipe(to(paths.temp + '/build'));
}

function releaseBuildJs() {
    return from([
        paths.dev + '/app.js',
        paths.dev + '/vendor.js',
    ], {allowEmpty: true})
        .pipe(plumber({
            errorHandler: errorHandler,
        }))
        .pipe(rename((path) => {
            path.extname = '.min' + path.extname;
        }))
        .pipe(uglifyjs(options.uglifyjs))
        .pipe(to(paths.temp + '/build'));
}

function releaseVersion() {
    let pipeline = from([
        paths.temp + '/build/*',
    ]);

    if (options.revision) {
        pipeline
            .pipe(rev())
            // Save to new location
            .pipe(to(paths.build))
            // Create a manifest file, which gives us a lookup for unversioned file
            // names to their versioned names
            .pipe(rev.manifest())
            // Save manifest
            .pipe(to(paths.build));
    } else {
        pipeline.pipe(to(paths.build));
    }

    return pipeline;
}

// =============================================================================
// Build commands
// =============================================================================

gulp.task('build:app:css', buildAppCss);
gulp.task('build:app:js', buildAppJs);


gulp.task('build:vendor:css', buildVendorCss);
gulp.task('build:vendor:js', buildVendorJs);

gulp.task('build:release:css', releaseBuildCss);
gulp.task('build:release:js', releaseBuildJs);

gulp.task('build', series(
    parallel('build:app:js', 'build:app:css')
));

gulp.task('build:app', series( 
    parallel('build:app:js', 'build:app:css')
));

gulp.task('build:vendor', series(
    parallel('build:vendor:js', 'build:vendor:css')
)); 

gulp.task('build:all', series(
    parallel('build', 'build:vendor')
));

// =============================================================================
// Release tasks
// =============================================================================

gulp.task('release:clean', releaseClean);
gulp.task('release:version', releaseVersion);
gulp.task('release:build:css', releaseBuildCss);
gulp.task('release:build:js', releaseBuildJs);

gulp.task('release', series(
    parallel('build:all', 'release:clean'),
    parallel('release:build:css', 'release:build:js'), 
    'release:version',
));


// =============================================================================
// Watch commands
// =============================================================================

gulp.task('watch:app', () => {
    // Watch CSS files for changes
    gulp.watch(
        [paths.resources + '/scss/**/*.scss'],
        parallel('build:app:css')
    );

    // Watch app JS for changes
    gulp.watch(
        [paths.resources + '/js/**/*.js'],
        parallel('build:app:js')
    );

});


gulp.task('watch:gulp', () => {
    gulp.watch('gulpfile.js', () => {
        alert('gulpfile.js changed! Make sure to restart gulp!');
    });
});

gulp.task('default', parallel('watch:gulp', 'watch:app'));
gulp.task('watch', parallel('watch:gulp', 'watch:app'));

gulp.task('watch:release', () => {
    gulp.watch(
        [
            paths.resources + '/scss/**/*.scss',
            paths.resources + '/js/**/*.js',
            paths.resources + '/svg-source/**/*.svg',
        ],
        parallel('release')
    );
});


// =============================================================================
// Misc tasks
// =============================================================================

//gulp.task('cycle', ['build:all', 'watch:app']);
//gulp.task('c', ['cycle']);

// =============================================================================
// Misc
// =============================================================================

function alert(message) {
    let line = '---------------------------------------------------------';

    beeper();

    console.log(line);
    console.log(message);
    console.log(line);
}

function errorHandler(error) {
    alert(error.toString());
    this.emit('end');
}
