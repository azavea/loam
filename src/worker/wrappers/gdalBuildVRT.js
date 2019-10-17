import randomKey from '../wRandomKey.js';
import {assembleDatasetFiles, wipeDatasetFiles} from '../fileHandling.js';
import throwIfError from '../throwIfError.js';
import strArrayToCharPtrPtr from '../stringArrayToCharPtrPtr.js';
import VRT from '../vrt.js';

/* global Module, FS */
export default function (GDALBuildVRT, errorHandling, rootPath) {
    // Args is expected to be an array of strings that could function as arguments to gdal_translate
    return function (datasets, args) {
        // Need to declare these up here so that the cleanup closure can capture them.
        let vrtDir;
        let vrtPath;
        let vrtDsPtr;
        let buildVrtArgsPtr;
        let headVrtPathsPtr;
        let buildVrtOptionsPtr;
        let frees1, frees2;
        let newVrt;
        let allSources;
        let allVrtParts;
        const cleanup = function () {
            if (buildVrtOptionsPtr && buildVrtOptionsPtr !== 0) {
                Module.ccall('GDALBuildVRTOptionsFree', null,
                    ['number'],
                    [buildVrtOptionsPtr]
                );
            }
            if (typeof frees1 !== 'undefined') {
                frees1.forEach(ptr => Module._free(ptr));
            }
            if (typeof buildVrtArgsPtr !== 'undefined') {
                Module._free(buildVrtArgsPtr);
            }
            if (typeof frees2 !== 'undefined') {
                frees2.forEach(ptr => Module._free(ptr));
            }
            if (typeof headVrtPathsPtr !== 'undefined') {
                Module._free(headVrtPathsPtr);
            }
            if (typeof vrtDsPtr !== 'undefined' && vrtDsPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], [vrtDsPtr]);
            }
            // We tried to make a new VRT, which means all the files are in place
            if (typeof newVrt !== 'undefined') {
                wipeDatasetFiles(newVrt, allVrtParts, allSources);
            } else {
                FS.rmdir(vrtDir);
                datasets.forEach(function (ds) {
                    wipeDatasetFiles(ds.headVrt, ds.vrtParts, ds.sources);
                });
            }
        };
        const vrtDirName = randomKey();

        vrtDir = rootPath + '/' + vrtDirName;
        FS.mkdir(vrtDir);

        // Put all the constituent parts in the filesystem
        datasets.forEach(function (ds) {
            assembleDatasetFiles(ds.headVrt, ds.vrtParts, ds.sources);
        });

        if (args && args.length !== 0) {
            [buildVrtArgsPtr, ...frees1] = strArrayToCharPtrPtr(args);
            buildVrtOptionsPtr = Module.ccall('GDALBuildVRTOptionsNew', 'number',
                ['number', 'number'],
                [buildVrtArgsPtr, null]
            );

            throwIfError(errorHandling, cleanup);
        } else {
            buildVrtOptionsPtr = null;
        }
        let headVrtPaths = datasets.map((ds) => ds.headVrt.fullPath);

        [headVrtPathsPtr, ...frees2] = strArrayToCharPtrPtr(headVrtPaths, false);
        // Call BuildVRT
        const vrtName = randomKey(16) + '.vrt';

        vrtPath = vrtDir + '/' + vrtName;
        vrtDsPtr = GDALBuildVRT(vrtPath, datasets.length, null, headVrtPathsPtr, buildVrtOptionsPtr, null);
        throwIfError(errorHandling, cleanup);

        // Close new dataset to ensure write to filesystem
        Module.ccall('GDALClose', null, ['number'], [vrtDsPtr]);
        vrtDsPtr = 0;
        // Read new VRT from file system
        const newVrtText = FS.readFile(vrtPath, { encoding: 'utf8' });

        // Combine all source arrays
        allSources = datasets.reduce(
            (accum, ds) => accum.concat(ds.sources),
            []
        );
        // Combine all headVrts (which will now be VrtParts
        const allHeadVrts = datasets.map((ds) => ds.headVrt);

        // Combine all VrtParts arrays the same way
        allVrtParts = datasets.reduce(
            (accum, ds) => accum.concat(ds.vrtParts),
            []
        ).concat(allHeadVrts);

        newVrt = new VRT(vrtName, [rootPath, vrtDirName], newVrtText);
        const result = {
            sources: allSources,
            vrtParts: allVrtParts,
            headVrt: newVrt
        };

        throwIfError(errorHandling, cleanup);

        cleanup();

        return result;
    };
}
