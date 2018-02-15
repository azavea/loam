/* global FS, importScripts, postMessage */

// w is for wrap
import wGDALOpen from './wrappers/gdalOpen.js';
import wGDALClose from './wrappers/gdalClose.js';

const TIFFPATH = '/tiffs';

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
            TIFFPATH
        );
        registry.GDALClose = wGDALClose(
            self.Module.cwrap('GDALClose', 'number', ['number']),
            TIFFPATH
        );
        registry.LoamFlushFS = function () {
            FS.unmount(TIFFPATH);
            return true;
        };
        FS.mkdir(TIFFPATH);
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
    postMessage({success: false, message: 'No "function" key specified or function not found'});
};
