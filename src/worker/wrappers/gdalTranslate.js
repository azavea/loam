import randomKey from '../wRandomKey.js';
import {assembleDatasetFiles, wipeDatasetFiles} from '../fileHandling.js';
import throwIfError from '../throwIfError.js';
import strArrayToCharPtrPtr from '../stringArrayToCharPtrPtr.js';
import VRT from '../vrt.js';

/* global Module, FS */
export default function (GDALTranslate, errorHandling, rootPath) {
    // Args is expected to be an array of strings that could function as arguments to gdal_translate
    return function (vrt, vrtParts, sources, args, vrtMode = true) {
        // Need to declare these up here so that the cleanup closure can capture them.
        let datasetPtr;
        let argPtrsArrayPtr;
        let frees;
        let newDatasetPtr;
        let translateOptionsPtr;
        let newVrt;
        const cleanup = function () {
            if (typeof datasetPtr !== 'undefined' && datasetPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], datasetPtr);
            }
            if (typeof newDatasetPtr !== 'undefined' && newDatasetPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], datasetPtr);
            }
            if (typeof translateOptionsPtr !== 'undefined' && translateOptionsPtr !== 0) {
                Module.ccall('GDALTranslateOptionsFree', null, ['number'], [translateOptionsPtr]);
            }
            if (typeof frees !== 'undefined') {
                frees.forEach(ptr => Module._free(ptr));
            }
            if (typeof argPtrsArrayPtr !== 'undefined') {
                Module._free(argPtrsArrayPtr);
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

        if (vrtMode) {
            // Add in a VRT output specification
            args = args.concat(['-of', 'VRT']);
        }
        [argPtrsArrayPtr, ...frees] = strArrayToCharPtrPtr(args);
        translateOptionsPtr = Module.ccall('GDALTranslateOptionsNew', 'number',
            ['number', 'number'],
            [argPtrsArrayPtr, null]
        );

        // Validate that the options were correct
        throwIfError(errorHandling, cleanup);

        // Now that we have our translate options, we need to make a file location to hold the output.
        // TODO: Extension
        const newFileName = randomKey(16) + '.vrt';
        const newDirName = randomKey();
        const newDir = rootPath + '/' + newDirName;
        const newFilePath = newDir + '/' + newFileName;

        FS.mkdir(newDir);
        // And then we can kick off the actual translation process.
        newDatasetPtr = GDALTranslate(newFilePath, datasetPtr, translateOptionsPtr, null);

        throwIfError(errorHandling, cleanup);

        // Close to ensure write to FS
        Module.ccall('GDALClose', null, ['number'], [newDatasetPtr]);
        let result;

        if (vrtMode) {
            const newFileContents = FS.readFile(newFilePath, { encoding: 'utf8' });

            newVrt = new VRT(newFileName, [rootPath, newDirName], newFileContents);
            result = {
                sources: sources,
                headVrt: newVrt,
                vrtParts: vrtParts.concat([vrt])
            };
        } else {
            const newFileContents = FS.readFile(newFilePath, { encoding: 'binary' });

            result = newFileContents;
        }

        cleanup();

        return result;
    };
}
