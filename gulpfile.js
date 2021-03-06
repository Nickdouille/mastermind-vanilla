var gulp        = require('gulp'),                      // Burp !
    g           = require('gulp-load-plugins')(),       // Charge les plugins Gulp automatiquement et les attach à l'objet "g"
    pngquant    = require('imagemin-pngquant'),         // Compresse PNG
    conf        = require('./package.json'),            // Récupération de la configuration déclarée dans package.json
    paths       = conf.paths,                           // Récupération des chemins de l'application
    runSequence = require('run-sequence'),              // Solution temporaire jusqu'à gulp 4 (https://github.com/gulpjs/gulp/issues/355)
    streamqueue = require('streamqueue'),
    del         = require('del'),
    prod        = false,                                // Par défaut en dév. Si on lance la tâche "build" : de la prod (voir tâche "build")
    banner      =   '/*! ' + conf.name + ' v' + conf.version +
                    ' | ' + conf.author + ' - ' + conf.contact +
                    ' | ' + conf.license.type + ' License' +
                    ' | ' + conf.homepage + ' */\n\n';

// **********************************
// CLEAN : Nettoyage de dist avant chaque rebuil
gulp.task('clean', function(cb) {
  del([paths.dist], cb);
});

// **********************************
// JS : hint + min/concat
gulp.task('js', ['js:hint', 'js:min'], function () {});

gulp.task('js:hint', function () {
  return gulp.src([
              'gulpfile.js',
              paths.src + '/js/**/.js',

              !paths.src + '/js/vendor/**'
            ])
            .pipe(g.jshint())
            .pipe(g.jshint.reporter('jshint-stylish'));
});

gulp.task('js:min', function () {
  return streamqueue(
            { objectMode: true },
            gulp.src(paths.src + '/js/vendor/**'),
            gulp.src(paths.src + '/js/*.js')
                .pipe(g.sourcemaps.init())
                .pipe(g.uglify())
        )
        .pipe(g.concat('app.' + conf.version + '.min.js'))
        .pipe(g.header(banner))
        .pipe(g.sourcemaps.write('.'))
        .pipe(gulp.dest(paths.dist + '/js'));
});

// **********************************
// CSS
gulp.task('css', function () {
  runSequence('css:next', 'css:copy');
});

gulp.task('css:next', function () {
  return gulp.src(paths.src + '/css/*.css')
              .pipe(g.cssnext({
                compress: prod,
                features: {
                  autoprefixer: {
                    browsers: ['last 2 versions'],
                    cascade: false
                  }
                }
              }))
              .pipe(gulp.dest(paths.src + '/css/build'));
});

gulp.task('css:copy', function () {
  return gulp.src([paths.src + '/css/vendor/**/*', paths.src + '/css/build/**/*.css'])
              .pipe(g.concat('app.' + conf.version + '.min.css'))
              .pipe(g.header(banner))
              .pipe(gulp.dest((prod ? paths.dist : paths.src) + '/css'));
});

// **********************************
// Fonts
gulp.task('fonts', ['ttf2woff', 'ttf2eot', 'copyttf'], function () {});

gulp.task('ttf2woff', function(){
  return gulp.src([paths.src + '/css/build/fonts/*.ttf'])
            .pipe(g.ttf2woff())
            .pipe(gulp.dest(paths.dist + '/css/fonts'));
});

gulp.task('ttf2eot', function(){
  return gulp.src([paths.src + '/css/build/fonts/*.ttf'])
            .pipe(g.ttf2eot())
            .pipe(gulp.dest(paths.dist + '/css/fonts'));
});

gulp.task('copyttf', function(){
  return gulp.src([paths.src + '/css/build/fonts/*.ttf'])
            .pipe(gulp.dest(paths.dist + '/css/fonts'));
});

// **********************************
// Img
gulp.task('img', ['img:png'], function () {});

gulp.task('img:png', function () {
  return gulp.src(paths.src + '/img/avatars/*')
            .pipe(g.imagemin({
              use: [pngquant({ quality: '65-80', speed: 4 })]
            }))
            .pipe(gulp.dest(paths.dist + '/img/avatars'));
});

// **********************************
// HTML
gulp.task('html', function () {
  return gulp.src(paths.src + '/index.html')
            .pipe(g.inject(
              gulp.src(
                prod ? [paths.dist + '/**/*.js', paths.dist + '/**/*.css'] : [paths.src + '/**/*.js', paths.src + '/css/build/*.css', paths.src + '/css/vendor/*.css'],
                {read: false}
              ),
              {relative: true}
            ))
            .pipe(g.if(prod, g.htmlMinifier({collapseWhitespace: true})))
            .pipe(gulp.dest(prod ? paths.dist : paths.src));
});

// **********************************
// DEV
gulp.task('server', function() {
  var watcherJS = gulp.watch(paths.src + '/js/**/*', ['js:hint', 'html']),
      watcherCSS = gulp.watch([paths.src + '/css/vendor/**/*', paths.src + '/css/*.css'], ['css:next', 'html']);

  watcherJS.on('change', function(event) {
    console.log('Fichier JS ' + event.path + ' changé !');
  });

  watcherCSS.on('change', function(event) {
    console.log('Fichier CSS ' + event.path + ' changé !');
  });

  gulp.src(paths.src)
      .pipe(g.webserver({
        host: "localhost",
        port: 4000,
        livereload: true,
        open:true
      }));
});

// **********************************
// Build : nettoyage + minifications/concat sur les JS/CSS + construction de l'index.html + copie des autres fichiers
gulp.task('build', function () {
  prod = true;
  runSequence('clean', 'js', 'css', 'fonts', 'img', 'html');
});

// Dev : serveur livereload + lint + watch
gulp.task('dev', function () {
  runSequence('js:hint', 'css:next', 'html', 'server');
});

// Par défaut : lancement de l'env de dév
gulp.task('default', ['dev']);
