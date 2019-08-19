/* global FS, Runtime, importScripts, postMessage */

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
import wGDALTranslate from './wrappers/gdalTranslate.js';
import wGDALWarp from './wrappers/gdalWarp.js';
import wReproject from './wrappers/reproject.js';
import wGDALRasterize from './wrappers/gdalRasterize';

const DATASETPATH = '/datasets';

let initialized = false;

let registry = {};
let errorHandling = {
    // In order to make enums available from JS it's necessary to use embind, which seems like
    // overkill for something this small. But this is a replication of the CPLErr enum in
    // cpl_error.h
    CPLErr: {
        CENone: 0,
        CEDebug: 1,
        CEWarning: 2,
        CEFailure: 3,
        CEFatal: 4
    },
    // These will be populated by onRuntimeInitialized, below
    CPLErrorReset: null,
    CPLGetLastErrorMsg: null,
    CPLGetLastErrorNo: null,
    CPLGetLastErrorType: null
};

self.Module = {
    'print': function (text) { console.log('stdout: ' + text); },
    'printErr': function (text) { console.log('stderr: ' + text); },
    // Optimized builds contain a .js.mem file which is loaded asynchronously;
    // this waits until that has finished before performing further setup.
    'onRuntimeInitialized': function () {
        // Initialize GDAL
        self.Module.ccall('GDALAllRegister', null, [], []);

        // Set up error handling
        errorHandling.CPLErrorReset = self.Module.cwrap('CPLErrorReset', null, []);
        errorHandling.CPLGetLastErrorMsg = self.Module.cwrap('CPLGetLastErrorMsg', 'string', []);
        errorHandling.CPLGetLastErrorNo = self.Module.cwrap('CPLGetLastErrorNo', 'number', []);
        errorHandling.CPLGetLastErrorType = self.Module.cwrap('CPLGetLastErrorType', 'number', []);
        // Get a "function pointer" to the built-in quiet error handler so that errors don't
        // cause tons of console noise.
        const cplQuietFnPtr = Runtime.addFunction(
            self.Module.cwrap('CPLQuietErrorHandler', 'number', ['number'])
        );

        // // Then set the error handler to the quiet handler.
        self.Module.ccall('CPLSetErrorHandler', 'number', ['number'], [cplQuietFnPtr]);

        // Set up JS proxy functions
        // Note that JS Number types are used to represent pointers, which means that
        // any time we want to pass a pointer to an object, such as in GDALOpen, which in
        // C returns a pointer to a GDALDataset, we need to use 'number'.
        //
        registry.GDALOpen = wGDALOpen(
            self.Module.cwrap('GDALOpenEx', 'number', ['string']),
            errorHandling,
            DATASETPATH
        );
        registry.GDALClose = wGDALClose(
            self.Module.cwrap('GDALClose', 'number', ['number']),
            errorHandling
        );
        registry.GDALGetRasterCount = wGDALGetRasterCount(
            self.Module.cwrap('GDALGetRasterCount', 'number', ['number']),
            errorHandling
        );
        registry.GDALGetRasterXSize = wGDALGetRasterXSize(
            self.Module.cwrap('GDALGetRasterXSize', 'number', ['number']),
            errorHandling
        );
        registry.GDALGetRasterYSize = wGDALGetRasterYSize(
            self.Module.cwrap('GDALGetRasterYSize', 'number', ['number']),
            errorHandling
        );
        registry.GDALGetProjectionRef = wGDALGetProjectionRef(
            self.Module.cwrap('GDALGetProjectionRef', 'string', ['number']),
            errorHandling
        );
        registry.GDALGetGeoTransform = wGDALGetGeoTransform(
            self.Module.cwrap('GDALGetGeoTransform', 'number', [
                'number', 'number'
            ]),
            errorHandling
        );
        registry.GDALTranslate = wGDALTranslate(
            self.Module.cwrap('GDALTranslate', 'number', [
                'string', // Output path
                'number', // GDALDatasetH source dataset
                'number', // GDALTranslateOptions *
                'number' // int * to use for error reporting
            ]),
            errorHandling,
            DATASETPATH
        );
        registry.GDALWarp = wGDALWarp(
            self.Module.cwrap('GDALWarp', 'number', [
                'string', // Destination dataset path or NULL
                'number', // GDALDatasetH destination dataset or NULL
                'number', // Number of input datasets
                'number', // GDALDatasetH * list of source datasets
                'number', // GDALWarpAppOptions *
                'number' // int * to use for error reporting
            ]),
            errorHandling,
            DATASETPATH
        );
        registry.GDALRasterize = wGDALRasterize(
            self.Module.cwrap('GDALRasterize', 'number', [
                'string', // Destination dataset path or NULL
                'number', // GDALDatasetH destination dataset or NULL
                'number', // GDALDatasetH source dataset handle
                'number', // GDALRasterizeOptions * or NULL,
                'number' // int * to use for error reporting
            ]),
            errorHandling,
            DATASETPATH
        );
        registry.LoamFlushFS = function () {
            let datasetFolders = FS.lookupPath(DATASETPATH).node.contents;

            Object.values(datasetFolders).forEach(node => {
                FS.unmount(FS.getPath(node));
                FS.rmdir(FS.getPath(node));
            });
            return true;
        };
        registry.LoamReproject = wReproject;
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
                message: error.message,
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
