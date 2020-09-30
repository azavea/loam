/* global Module */
export default function (GDALGetGeoTransform, errorHandling) {
    return function (datasetPtr) {
        // This is the first wrapper where things get a bit hairy; the C function follows a common C
        // pattern where an array to store the results is allocated and passed into the function,
        // which populates the array with the results. Emscripten supports passing arrays to
        // functions, but it always creates a *copy* of the array, which means that the original JS
        // array remains unchanged, which isn't what we want in this case. So first, we have to
        // malloc an array inside the Emscripten heap with the correct size. In this case that is 6
        // because the GDAL affine transform array has six elements.
        let byteOffset = Module._malloc(6 * Float64Array.BYTES_PER_ELEMENT);

        // byteOffset is now a pointer to the start of the double array in Emscripten heap space
        // GDALGetGeoTransform dumps 6 values into the passed double array.
        GDALGetGeoTransform(datasetPtr, byteOffset);

        // Module.HEAPF64 provides a view into the Emscripten heap, as an array of doubles.
        // Therefore, our byte offset from _malloc needs to be converted into a double offset, so we
        // divide it by the number of bytes per double, and then get a subarray of those six
        // elements off the Emscripten heap.
        let geoTransform = Module.HEAPF64.subarray(
            byteOffset / Float64Array.BYTES_PER_ELEMENT,
            byteOffset / Float64Array.BYTES_PER_ELEMENT + 6
        );

        let errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            Module._free(byteOffset);
            let message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        } else {
            // To avoid memory leaks in the Emscripten heap, we need to free up the memory we allocated
            // after we've converted it into a Javascript object.
            let result = Array.from(geoTransform);

            Module._free(byteOffset);

            return result;
        }
    };
}
