import {assembleDatasetFiles, wipeDatasetFiles} from '../fileHandling.js';
import throwIfError from '../throwIfError.js';

/* global Module */
export default function (GDALGetRasterXSize, errorHandling) {
    return function (vrt, vrtParts, sources) {
        let datasetPtr;
        const cleanup = function () {
            if (typeof datasetPtr !== 'undefined' && datasetPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], datasetPtr);
            }
            wipeDatasetFiles(vrt, vrtParts, sources);
        };

        // Put everything in the filesystem
        assembleDatasetFiles(vrt, vrtParts, sources);
        datasetPtr = Module.ccall('GDALOpen', 'number', ['string'], [vrt.fullPath]);

        throwIfError(errorHandling, cleanup);
        const result = GDALGetRasterXSize(datasetPtr);

        throwIfError(errorHandling, cleanup);
        cleanup();
        return result;
    };
}
