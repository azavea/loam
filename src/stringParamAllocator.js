import { isArrayAllStrings } from './validation.js';

/* global Module */
export default class ParamParser {
    constructor(args) {
        let self = this;

        if (!isArrayAllStrings(args)) {
            throw new Error('All items in the argument list must be strings');
        }

        self.args = args;
    }

    allocate() {
        const self = this;

        // So first, we need to allocate Emscripten heap space sufficient to store each string as a
        // null-terminated C string.
        // Because the C function signature is char **, this array of pointers is going to need to
        // get copied into Emscripten heap space eventually, so we're going to prepare by storing
        // the pointers as a typed array so that we can more easily copy it into heap space later.
        let argPtrsArray = Uint32Array.from(
            self.args
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
        self.args.forEach(function (argStr, i) {
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

        self.argPtrsArray = argPtrsArray;
        self.argPtrsArrayPtr = argPtrsArrayPtr;
    }

    deallocate() {
        const self = this;

        Module._free(self.argPtrsArrayPtr);
        // Don't try to free the null terminator byte
        self.argPtrsArray
            .subarray(0, self.argPtrsArray.length - 1)
            .forEach((ptr) => Module._free(ptr));
        delete self.argPtrsArray;
        delete self.argPtrsArrayPtr;
    }

}
