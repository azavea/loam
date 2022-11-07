import randomKey from '../randomKey.js';
import guessFileExtension from '../guessFileExtension.js';
import ParamParser from '../stringParamAllocator.js';

/* global Module, FS, MEMFS */
export default function (GDALVectorTranslate, errorHandling, rootPath) {
    // Args is expected to be an array of strings that could function as arguments to ogr2ogr
    return function (dataset, args) {
        const params = new ParamParser(args);

        params.allocate();

        // Whew, all finished. argPtrsArrayPtr is now the address of the start of the list of
        // pointers in Emscripten heap space. Each pointer identifies the address of the start of a
        // parameter string, also stored in heap space. This is the direct equivalent of a char **,
        // which is what GDALVectorTranslateOptionsNew requires.
        const translateOptionsPtr = Module.ccall(
            'GDALVectorTranslateOptionsNew',
            'number',
            ['number', 'number'],
            [params.argPtrsArrayPtr, null]
        );

        // Validate that the options were correct
        const optionsErrType = errorHandling.CPLGetLastErrorType();

        if (
            optionsErrType === errorHandling.CPLErr.CEFailure ||
            optionsErrType === errorHandling.CPLErr.CEFatal
        ) {
            Module.ccall('GDALVectorTranslateOptionsFree', null, ['number'], [translateOptionsPtr]);
            params.deallocate();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALVectorTranslate: ' + message);
        }

        // Now that we have our translate options, we need to make a file location to hold the
        // output.
        const directory = rootPath + randomKey();

        FS.mkdir(directory);
        // This makes it easier to remove later because we can just unmount rather than recursing
        // through the whole directory structure.
        FS.mount(MEMFS, {}, directory);
        const filename = randomKey(8) + '.' + guessFileExtension(args);

        const filePath = directory + '/' + filename;

        // GDALVectorTranslate takes a list of input datasets, even though it can only ever have one
        // dataset in that list, so we need to allocate space for that list and then store the
        // dataset pointer in that list.
        const dsPtrsArray = Uint32Array.from([dataset]);
        const dsPtrsArrayPtr = Module._malloc(dsPtrsArray.length * dsPtrsArray.BYTES_PER_ELEMENT);

        Module.HEAPU32.set(dsPtrsArray, dsPtrsArrayPtr / dsPtrsArray.BYTES_PER_ELEMENT);

        // TODO: The last parameter is an int* that can be used to detect certain kinds of errors,
        // but I'm not sure how it works yet and whether it gives the same or different information
        // than CPLGetLastErrorType
        // We can get some error information out of the final pbUsageError parameter, which is an
        // int*, so malloc ourselves an int and set it to 0 (False)
        const usageErrPtr = Module._malloc(Int32Array.BYTES_PER_ELEMENT);

        Module.setValue(usageErrPtr, 0, 'i32');

        // And then we can kick off the actual translation process.
        const newDatasetPtr = GDALVectorTranslate(
            filePath,
            0, // Destination dataset, which we don't use, so pass NULL
            1, // nSrcCount, which must always be 1 https://gdal.org/api/gdal_utils.html
            dsPtrsArrayPtr, // This needs to be a list of input datasets
            translateOptionsPtr,
            usageErrPtr
        );

        const errorType = errorHandling.CPLGetLastErrorType();
        // If we ever want to use the usage error pointer:
        // let usageErr = Module.getValue(usageErrPtr, 'i32');

        // The final set of cleanup we need to do, in a function to avoid writing it twice.
        function cleanUp() {
            Module.ccall('GDALVectorTranslateOptionsFree', null, ['number'], [translateOptionsPtr]);
            Module._free(usageErrPtr);
            Module._free(dsPtrsArrayPtr);
            params.deallocate();
        }

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            cleanUp();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALVectorTranslate: ' + message);
        } else {
            const result = {
                datasetPtr: newDatasetPtr,
                filePath: filePath,
                directory: directory,
                filename: filename,
            };

            cleanUp();
            return result;
        }
    };
}
