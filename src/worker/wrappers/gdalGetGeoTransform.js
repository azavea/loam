import {assembleDatasetFiles, wipeDatasetFiles} from '../fileHandling.js';
import throwIfError from '../throwIfError.js';

/* global Module */
export default function (GDALGetGeoTransform, errorHandling) {
    return function (vrt, vrtParts, sources) {
        let byteOffset;
        let datasetPtr;
        const cleanup = function () {
            if (typeof datasetPtr !== 'undefined' && datasetPtr !== 0) {
                Module.ccall('GDALClose', null, ['number'], datasetPtr);
            }
            wipeDatasetFiles(vrt, vrtParts, sources);
            if (typeof byteOffset !== 'undefined') {
                Module._free(byteOffset);
            }
        };

        // Put everything in the filesystem
        assembleDatasetFiles(vrt, vrtParts, sources);
        datasetPtr = Module.ccall('GDALOpen', 'number', ['string'], [vrt.fullPath]);

        throwIfError(errorHandling, cleanup);
        // This is the first wrapper where things get a bit hairy; the C function follows a common C
        // pattern where an array to store the results is allocated and passed into the function,
        // which populates the array with the results. Emscripten supports passing arrays to
        // functions, but it always creates a *copy* of the array, which means that the original JS
        // array remains unchanged, which isn't what we want in this case. So first, we have to
        // malloc an array inside the Emscripten heap with the correct size. In this case that is 6
        // because the GDAL affine transform array has six elements.
        byteOffset = Module._malloc(6 * Float64Array.BYTES_PER_ELEMENT);

        // byteOffset is now a pointer to the start of the double array in Emscripten heap space
        // GDALGetGeoTransform dumps 6 values into the passed double array.
        GDALGetGeoTransform(datasetPtr, byteOffset);
        throwIfError(errorHandling, cleanup);

        // Module.HEAPF64 provides a view into the Emscripten heap, as an array of doubles.
        // Therefore, our byte offset from _malloc needs to be converted into a double offset, so we
        // divide it by the number of bytes per double, and then get a subarray of those six
        // elements off the Emscripten heap.
        const geoTransform = Module.HEAPF64.subarray(
            byteOffset / Float64Array.BYTES_PER_ELEMENT,
            byteOffset / Float64Array.BYTES_PER_ELEMENT + 6
        );
        const result = Array.from(geoTransform);

        cleanup();
        return result;
    };
}
