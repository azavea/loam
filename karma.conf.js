module.exports = function(config) {
    config.set({
        frameworks: ['mocha', 'chai'],
        preprocessors: {
            'test/**/*.spec.js': ['babel']
        },
        babelPreprocessor: {
            filename: function (file) {
                return file.originalPath.replace(/\.js$/, '.es5.js');
            },
            sourceFileName: function (file) {
                return file.originalPath;
            }
        },
        files: [
            'lib/loam.js',
            {
                pattern: 'lib/loam-worker.js',
                watched: true,
                included: false,
                served: true
            },
            {
                pattern: 'lib/*.js.map',
                watched: false,
                included: false,
                served: true
            },
            'test/**/*.spec.js',
            {
                pattern: 'node_modules/gdal-js/gdal.*',
                watched: false,
                included: false,
                served: true
            }
        ],
        proxies: {
            '/loam-worker.js': '/base/lib/loam-worker.js',
            '/gdal.js': '/base/node_modules/gdal-js/gdal.js',
            '/gdal.wasm': '/base/node_modules/gdal-js/gdal.wasm',
            '/gdal.data': '/base/node_modules/gdal-js/gdal.data'
        },
        // WebAssembly takes a while to parse
        browserDisconnectTimeout: 4000,
        reporters: ['progress'],
        port: 9876,  // karma web server port
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        concurrency: Infinity
    });
};
