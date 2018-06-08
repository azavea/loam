import randomKey from '../wRandomKey.js';
import {assembleDatasetFiles, wipeDatasetFiles} from '../fileHandling.js';
import throwIfError from '../throwIfError.js';
import strArrayToCharPtrPtr from '../stringArrayToCharPtrPtr.js';
import VRT from '../vrt.js';

/* global Module, FS */
export default function (GDALWarp, errorHandling, rootPath) {
    // Args is expected to be an array of strings that could function as arguments to gdal_translate
    return function (vrt, vrtParts, sources, args) {
        // Need to declare these up here so that the cleanup closure can capture them.
        let datasetPtr;
        let argPtrsArrayPtr;
        let frees;
        let datasetListPtr;
        let newDatasetPtr;
        let warpAppOptionsPtr;
        let newVrt;
        const cleanup = function () {
            if (typeof datasetPtr !== 'undefined' && datasetPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], datasetPtr);
            }
            if (typeof newDatasetPtr !== 'undefined' && newDatasetPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], datasetPtr);
            }
            if (typeof translateOptionsPtr !== 'undefined' && warpAppOptionsPtr !== 0) {
                Module.ccall('GDALWarpAppOptionsFree', null, ['number'], [warpAppOptionsPtr]);
            }
            if (typeof frees !== 'undefined') {
                frees.forEach(ptr => Module._free(ptr));
            }
            if (typeof argPtrsArrayPtr !== 'undefined') {
                Module._free(argPtrsArrayPtr);
            }
            if (typeof datasetListPtr !== 'undefined') {
                Module._free(datasetListPtr);
            }
            if (typeof newVrt !== 'undefined') {
                wipeDatasetFiles(newVrt, vrtParts.concat([vrt]), sources);
            } else {
                wipeDatasetFiles(vrt, vrtParts, sources);
            }
        };

        // Put everything in the filesystem
        assembleDatasetFiles(vrt, vrtParts, sources);
        datasetPtr = Module.ccall('GDALOpen', 'number', ['string'], [vrt.fullPath]);

        throwIfError(errorHandling, cleanup);
        // Add in a VRT output specification and convert into a char **
        [argPtrsArrayPtr, ...frees] = strArrayToCharPtrPtr(args.concat(['-of', 'VRT']));
        warpAppOptionsPtr = Module.ccall('GDALWarpAppOptionsNew', 'number',
            ['number', 'number'],
            [argPtrsArrayPtr, null]
        );
        // Validate that the options were correct
        throwIfError(errorHandling, cleanup);

        // Now that we have our translate options, we need to make a file location to hold the output.
        const newVrtName = randomKey(16) + '.vrt';
        const newVrtDirName = randomKey();
        const newVrtDir = rootPath + '/' + newVrtDirName;
        const newVrtPath = newVrtDir + '/' + newVrtName;

        FS.mkdir(newVrtDir);
        // And then we can kick off the actual warping process.
        // We also need a GDALDatasetH * list of datasets. Since we're just warping a single dataset
        // at a time, we don't need to do anything fancy here.
        datasetListPtr = Module._malloc(4); // 32-bit pointer

        Module.setValue(datasetListPtr, datasetPtr, '*'); // Set datasetListPtr to the address of dataset
        newDatasetPtr = GDALWarp(
            newVrtPath, // Output
            0, // NULL because filePath is not NULL
            1, // Number of input datasets; this is always called on a single dataset
            datasetListPtr,
            warpAppOptionsPtr,
            null
        );

        throwIfError(errorHandling, cleanup);

        // Close to ensure write to FS
        Module.ccall('GDALClose', null, ['number'], [newDatasetPtr]);
        const newVrtText = FS.readFile(newVrtPath, { encoding: 'utf8' });

        newVrt = new VRT(newVrtName, [rootPath, newVrtDirName], newVrtText);

        const result = {
            sources: sources,
            headVrt: newVrt,
            vrtParts: vrtParts.concat([vrt])
        };

        cleanup();

        return result;
    };
}
