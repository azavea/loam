/* global FS, importScripts, postMessage */

// w is for wrap
// The wrappers are factories that return functions which perform the necessary setup and
// teardown for interacting with GDAL inside Emscripten world.
import wGDALOpen from './wrappers/gdalOpen.js';
import wGDALClose from './wrappers/gdalClose.js';
import wGDALGetRasterCount from './wrappers/gdalGetRasterCount.js';
import wGDALGetRasterXSize from './wrappers/gdalGetRasterXSize.js';
import wGDALGetRasterYSize from './wrappers/gdalGetRasterYSize.js';
import wGDALGetProjectionRef from './wrappers/gdalGetProjectionRef.js';
import wGDALGetGeoTransform from './wrappers/gdalGetGeoTransform.js';

const DATASETPATH = '/datasets';

let initialized = false;

let registry = {};

self.Module = {
    'print': function (text) { console.log('stdout: ' + text); },
    'printErr': function (text) { console.log('stderr: ' + text); },
    // Optimized builds contain a .js.mem file which is loaded asynchronously;
    // this waits until that has finished before performing further setup.
    'onRuntimeInitialized': function () {
        // Initialize GDAL
        self.Module.ccall('GDALAllRegister', null, [], []);

        // Set up JS proxy functions
        // Note that JS Number types are used to represent pointers, which means that
        // any time we want to pass a pointer to an object, such as in GDALOpen, which in
        // C returns a pointer to a GDALDataset, we need to use 'number'.
        //
        registry.GDALOpen = wGDALOpen(
            self.Module.cwrap('GDALOpen', 'number', ['string']),
            DATASETPATH
        );
        registry.GDALClose = wGDALClose(
            self.Module.cwrap('GDALClose', 'number', ['number']),
            DATASETPATH
        );
        registry.GDALGetRasterCount = wGDALGetRasterCount(
            self.Module.cwrap('GDALGetRasterCount', 'number', ['number'])
        );
        registry.GDALGetRasterXSize = wGDALGetRasterXSize(
            self.Module.cwrap('GDALGetRasterXSize', 'number', ['number'])
        );
        registry.GDALGetRasterYSize = wGDALGetRasterYSize(
            self.Module.cwrap('GDALGetRasterYSize', 'number', ['number'])
        );
        registry.GDALGetProjectionRef = wGDALGetProjectionRef(
            self.Module.cwrap('GDALGetProjectionRef', 'string', ['number'])
        );
        registry.GDALGetGeoTransform = wGDALGetGeoTransform(
            self.Module.cwrap('GDALGetGeoTransform', 'number', [
                'number', 'number'
            ])
        );
        registry.LoamFlushFS = function () {
            let datasetFolders = FS.lookupPath(DATASETPATH).node.contents;

            Object.values(datasetFolders).forEach(node => {
                FS.unmount(FS.getPath(node));
                FS.rmdir(FS.getPath(node));
            });
            return true;
        };
        FS.mkdir(DATASETPATH);
        initialized = true;
        postMessage({ready: true});
    }
};

// Load gdal.js. This will populate the Module object, and then call
// Module.onRuntimeInitialized() when it is ready for user code to interact with it.
importScripts('gdal.js');

onmessage = function (msg) {
    if (!initialized) {
        postMessage({success: false, message: 'Runtime not yet initialized'});
        return;
    }
    if (msg.data['function'] && registry[msg.data['function']]) {
        let func = registry[msg.data['function']];
        let args = msg.data.arguments;

        // TODO: More error handling
        try {
            let result = func(...args);

            postMessage({
                success: true,
                result: result,
                id: msg.data.id
            });
        } catch (error) {
            postMessage({
                success: false,
                message: error.toString(),
                id: msg.data.id
            });
        }
        return;
    }
    postMessage({
        success: false,
        message: 'No "function" key specified or function not found',
        id: msg.data.id
    });
};
