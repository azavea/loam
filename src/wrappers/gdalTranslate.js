import randomKey from '../randomKey.js';
import guessFileExtension from '../guessFileExtension.js';
import { isArrayAllStrings } from '../validation.js';

/* global Module, FS, MEMFS */
export default function (GDALTranslate, errorHandling, rootPath) {
    // Args is expected to be an array of strings that could function as arguments to gdal_translate
    return function (dataset, args) {
        if (!isArrayAllStrings(args)) {
            throw new Error('All items in the argument list must be strings');
        }
        // So first, we need to allocate Emscripten heap space sufficient to store each string as a
        // null-terminated C string.
        // Because the C function signature is char **, this array of pointers is going to need to
        // get copied into Emscripten heap space eventually, so we're going to prepare by storing
        // the pointers as a typed array so that we can more easily copy it into heap space later.
        let argPtrsArray = Uint32Array.from(args.map(argStr => {
            return Module._malloc(Module.lengthBytesUTF8(argStr) + 1); // +1 for the null terminator byte
        }).concat([0]));
        // ^ In addition to each individual argument being null-terminated, the GDAL docs specify that
        // GDALTranslateOptionsNew takes its options passed in as a null-terminated array of
        // pointers, so we have to add on a null (0) byte at the end.

        // Next, we need to write each string from the JS string array into the Emscripten heap space
        // we've allocated for it.
        args.forEach(function (argStr, i) {
            Module.stringToUTF8(argStr, argPtrsArray[i], Module.lengthBytesUTF8(argStr) + 1);
        });

        // Now, as mentioned above, we also need to copy the pointer array itself into heap space.
        let argPtrsArrayPtr = Module._malloc(argPtrsArray.length * argPtrsArray.BYTES_PER_ELEMENT);

        Module.HEAPU32.set(argPtrsArray, argPtrsArrayPtr / argPtrsArray.BYTES_PER_ELEMENT);

        // Whew, all finished. argPtrsArrayPtr is now the address of the start of the list of
        // pointers in Emscripten heap space. Each pointer identifies the address of the start of a
        // parameter string, also stored in heap space. This is the direct equivalent of a char **,
        // which is what GDALTranslateOptionsNew requires.
        let translateOptionsPtr = Module.ccall('GDALTranslateOptionsNew', 'number',
            ['number', 'number'],
            [argPtrsArrayPtr, null]
        );

        // Validate that the options were correct
        let optionsErrType = errorHandling.CPLGetLastErrorType();

        if (optionsErrType === errorHandling.CPLErr.CEFailure ||
                optionsErrType === errorHandling.CPLErr.CEFatal) {
            Module._free(argPtrsArrayPtr);
            // Don't try to free the null terminator byte
            argPtrsArray.subarray(0, argPtrsArray.length - 1).forEach(ptr => Module._free(ptr));
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        }

        // Now that we have our translate options, we need to make a file location to hold the output.
        let directory = rootPath + '/' + randomKey();

        FS.mkdir(directory);
        // This makes it easier to remove later because we can just unmount rather than recursing
        // through the whole directory structure.
        FS.mount(MEMFS, {}, directory);
        let filename = randomKey(8) + '.' + guessFileExtension(args);

        let filePath = directory + '/' + filename;

        // And then we can kick off the actual translation process.
        // TODO: The last parameter is an int* that can be used to detect certain kinds of errors,
        // but I'm not sure how it works yet and whether it gives the same or different information
        // than CPLGetLastErrorType
        // We can get some error information out of the final pbUsageError parameter, which is an
        // int*, so malloc ourselves an int and set it to 0 (False)
        let usageErrPtr = Module._malloc(Int32Array.BYTES_PER_ELEMENT);

        Module.setValue(usageErrPtr, 0, 'i32');
        let newDatasetPtr = GDALTranslate(filePath, dataset, translateOptionsPtr, usageErrPtr);

        let errorType = errorHandling.CPLGetLastErrorType();
        // If we ever want to use the usage error pointer:
        // let usageErr = Module.getValue(usageErrPtr, 'i32');

        // The final set of cleanup we need to do, in a function to avoid writing it twice.
        function cleanUp() {
            Module.ccall('GDALTranslateOptionsFree', null, ['number'], [translateOptionsPtr]);
            Module._free(argPtrsArrayPtr);
            Module._free(usageErrPtr);
            // Don't try to free the null terminator byte
            argPtrsArray.subarray(0, argPtrsArray.length - 1).forEach(ptr => Module._free(ptr));
        }

        // Check for errors; clean up and throw if error is detected
        if (errorType === errorHandling.CPLErr.CEFailure ||
                errorType === errorHandling.CPLErr.CEFatal) {
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
