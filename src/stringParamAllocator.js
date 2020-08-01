import { isArrayAllStrings } from './validation.js';

/* global Module */
export default class ParamParser {
    constructor(args, errorHandling) {
        let self = this;

        if (!isArrayAllStrings(args)) {
            throw new Error('All items in the argument list must be strings');
        }
        // So first, we need to allocate Emscripten heap space sufficient to store each string as a
        // null-terminated C string.
        // Because the C function signature is char **, this array of pointers is going to need to
        // get copied into Emscripten heap space eventually, so we're going to prepare by storing
        // the pointers as a typed array so that we can more easily copy it into heap space later.
        let argPtrsArray = Uint32Array.from(
            args
                .map((argStr) => {
                    return Module._malloc(Module.lengthBytesUTF8(argStr) + 1); // +1 for the null terminator byte
                })
                .concat([0])
        );
        // ^ In addition to each individual argument being null-terminated, the GDAL docs specify that
        // GDALTranslateOptionsNew takes its options passed in as a null-terminated array of
        // pointers, so we have to add on a null (0) byte at the end.

        // Next, we need to write each string from the JS string array into the Emscripten heap space
        // we've allocated for it.
        args.forEach(function (argStr, i) {
            Module.stringToUTF8(
                argStr,
                argPtrsArray[i],
                Module.lengthBytesUTF8(argStr) + 1
            );
        });

        // Now, as mentioned above, we also need to copy the pointer array itself into heap space.
        let argPtrsArrayPtr = Module._malloc(
            argPtrsArray.length * argPtrsArray.BYTES_PER_ELEMENT
        );

        Module.HEAPU32.set(
            argPtrsArray,
            argPtrsArrayPtr / argPtrsArray.BYTES_PER_ELEMENT
        );

        self.errorHandling = errorHandling;
        self.argPtrsArray = argPtrsArray;
        self.argPtrsArrayPtr = argPtrsArrayPtr;
    }

    validateOptions() {
        let self = this;

        let errorHandling = self.errorHandling;

        // Validate that the options were correct
        let optionsErrType = errorHandling.CPLGetLastErrorType();

        if (
            optionsErrType === errorHandling.CPLErr.CEFailure ||
      optionsErrType === errorHandling.CPLErr.CEFatal
        ) {
            Module._free(self.argPtrsArrayPtr);
            // Don't try to free the null terminator byte
            self.argPtrsArray
                .subarray(0, self.argPtrsArray.length - 1)
                .forEach((ptr) => Module._free(ptr));
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        }

    }

    cleanUp(call, options, usageErrPtr) {
        let self = this;

        Module.ccall(
            call,
            null,
            ['number'],
            [options]
        );
        Module._free(self.argPtrsArrayPtr);
        Module._free(usageErrPtr);
        // Don't try to free the null terminator byte
        self.argPtrsArray
            .subarray(0, self.argPtrsArray.length - 1)
            .forEach((ptr) => Module._free(ptr));
    }
}
