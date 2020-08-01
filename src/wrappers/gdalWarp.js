import randomKey from '../randomKey.js';
import guessFileExtension from '../guessFileExtension.js';
import ParamParser from '../stringParamAllocator.js';

/* global Module, FS, MEMFS */
export default function (GDALWarp, errorHandling, rootPath) {
    // Args is expected to be an array of strings that could function as arguments to gdal_translate
    return function (dataset, args) {
        let params = new ParamParser(args);

        params.allocate();

        // Whew, all finished. argPtrsArrayPtr is now the address of the start of the list of
        // pointers in Emscripten heap space. Each pointer identifies the address of the start of a
        // parameter string, also stored in heap space. This is the direct equivalent of a char **,
        // which is what GDALWarpAppOptionsNew requires.
        let warpAppOptionsPtr = Module.ccall(
            'GDALWarpAppOptionsNew',
            'number',
            ['number', 'number'],
            [params.argPtrsArrayPtr, null]
        );

        // Validate that the options were correct
        let optionsErrType = errorHandling.CPLGetLastErrorType();

        if (
            optionsErrType === errorHandling.CPLErr.CEFailure ||
      optionsErrType === errorHandling.CPLErr.CEFatal
        ) {
            params.deallocate();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        }

        let directory = rootPath + '/' + randomKey();

        FS.mkdir(directory);
        // This makes it easier to remove later because we can just unmount rather than recursing
        // through the whole directory structure.
        FS.mount(MEMFS, {}, directory);
        let filename = randomKey(8) + '.' + guessFileExtension(args);

        let filePath = directory + '/' + filename;

        // And then we can kick off the actual warping process.
        // TODO: The last parameter is an int* that can be used to detect certain kinds of errors,
        // but I'm not sure how it works yet and whether it gives the same or different information
        // than CPLGetLastErrorType
        // We can get some error information out of the final pbUsageError parameter, which is an
        // int*, so malloc ourselves an int and set it to 0 (False)
        let usageErrPtr = Module._malloc(Int32Array.BYTES_PER_ELEMENT);

        Module.setValue(usageErrPtr, 0, 'i32');

        // We also need a GDALDatasetH * list of datasets. Since we're just warping a single dataset
        // at a time, we don't need to do anything fancy here.
        let datasetListPtr = Module._malloc(4); // 32-bit pointer

        Module.setValue(datasetListPtr, dataset, '*'); // Set datasetListPtr to the address of dataset
        let newDatasetPtr = GDALWarp(
            filePath, // Output
            0, // NULL because filePath is not NULL
            1, // Number of input datasets; this is always called on a single dataset
            datasetListPtr,
            warpAppOptionsPtr,
            usageErrPtr
        );

        // The final set of cleanup we need to do, in a function to avoid writing it twice.
        function cleanUp() {
            Module.ccall(
                'GDALWarpAppOptionsFree',
                null,
                ['number'],
                [warpAppOptionsPtr]
            );
            Module._free(usageErrPtr);
            params.deallocate();
        }

        let errorType = errorHandling.CPLGetLastErrorType();
        // If we ever want to use the usage error pointer:
        // let usageErr = Module.getValue(usageErrPtr, 'i32');

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
      errorType === errorHandling.CPLErr.CEFatal
        ) {
            cleanUp();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        } else {
            const result = {
                datasetPtr: newDatasetPtr,
                filePath: filePath,
                directory: directory,
                filename: filename
            };

            cleanUp();
            return result;
        }
    };
}
