// Construct a null-terminated char ** of arguments for use by GDAL*OptionsNew-style functions
/* globals Module */
export default function stringArrayToCharPtrPtr(strings, nullTerminate = true) {
    // So first, we need to allocate Emscripten heap space sufficient to store each string as a
    // null-terminated C string.
    // Because the C function signature is char **, this array of pointers is going to need to
    // get copied into Emscripten heap space eventually, so we're going to prepare by storing
    // the pointers as a typed array so that we can more easily copy it into heap space later.
    let strPtrs = strings.map(str => {
        return Module._malloc(Module.lengthBytesUTF8(str) + 1); // +1 for the null terminator byte
    });

    if (nullTerminate) {
        strPtrs = strPtrs.concat([0]);
    }
    const strPtrsArray = Uint32Array.from(strPtrs);

    // ^ In addition to each individual argument being null-terminated, the GDAL docs specify that
    // GDAL*OptionsNew takes their options passed in as a null-terminated array of
    // pointers, so we have to add on a null (0) byte at the end. If nullTerminate is false then we
    // output an ordinary char ** without a null terminator.

    // Next, we need to write each string from the JS string array into the Emscripten heap space
    // we've allocated for it.
    strings.forEach(function (str, i) {
        Module.stringToUTF8(str, strPtrsArray[i], Module.lengthBytesUTF8(str) + 1);
    });

    // Now, as mentioned above, we also need to copy the pointer array itself into heap space.
    let strPtrsArrayPtr = Module._malloc(strPtrsArray.length * strPtrsArray.BYTES_PER_ELEMENT);

    Module.HEAPU32.set(strPtrsArray, strPtrsArrayPtr / strPtrsArray.BYTES_PER_ELEMENT);

    // Whew, all finished. argPtrsArrayPtr is now the address of the start of the list of
    // pointers in Emscripten heap space. Each pointer identifies the address of the start of a
    // parameter string, also stored in heap space. This is the direct equivalent of a char **,
    // which is what GDAL*OptionsNew-style functions requires.
    // Everything needs to be freed after using, so we return all the pointers that we've allocated.
    if (nullTerminate) {
        strPtrs.pop(); // Remove null-terminator because it's not freeable
    }
    return [strPtrsArrayPtr].concat(strPtrs);
}
