/* global Module */
export default function (srcCRSStr, destCRSStr, xCoords, yCoords) {
    // This should never happen
    if (xCoords.length !== yCoords.length) {
        throw new Error('Got mismatched numbers of x and y coordinates.');
    }

    let OSRNewSpatialReference = Module.cwrap('OSRNewSpatialReference', 'number', ['string']);

    let OCTNewCoordinateTransformation = Module.cwrap('OCTNewCoordinateTransformation', 'number', [
        'number',
        'number',
    ]);

    // Transform arrays of coordinates in-place
    // Params are:
    // 1. Coordinate transformation to use
    // 2. Number of coordinates to transform
    // 3. Array of X coordinates to transform
    // 4. Array of Y coordinates to transform
    // 5. Array of Z coordinates to transform
    let OCTTransform = Module.cwrap('OCTTransform', 'number', [
        'number',
        'number',
        'number',
        'number',
        'number',
    ]);

    // We need SRSes for the source and destinations of our transformation
    let sourceSrs = OSRNewSpatialReference(srcCRSStr);

    let targetSrs = OSRNewSpatialReference(destCRSStr);

    // Now we can create a CoordinateTransformation object to transform between the two
    let coordTransform = OCTNewCoordinateTransformation(sourceSrs, targetSrs);

    // And lastly, we can transform the Xs and Ys. This requires a similar malloc process to the
    // affine transform function, since the coordinates are transformed in-place
    let xCoordPtr = Module._malloc(xCoords.length * xCoords.BYTES_PER_ELEMENT);

    let yCoordPtr = Module._malloc(yCoords.length * yCoords.BYTES_PER_ELEMENT);

    // But this time we copy into the memory space from our external array
    Module.HEAPF64.set(xCoords, xCoordPtr / xCoords.BYTES_PER_ELEMENT);
    Module.HEAPF64.set(yCoords, yCoordPtr / yCoords.BYTES_PER_ELEMENT);
    // Z is null in this case. This transforms in place.
    OCTTransform(coordTransform, xCoords.length, xCoordPtr, yCoordPtr, null);
    // Pull out the coordinates
    let transXCoords = Array.from(
        Module.HEAPF64.subarray(
            xCoordPtr / xCoords.BYTES_PER_ELEMENT,
            xCoordPtr / xCoords.BYTES_PER_ELEMENT + xCoords.length
        )
    );

    let transYCoords = Array.from(
        Module.HEAPF64.subarray(
            yCoordPtr / yCoords.BYTES_PER_ELEMENT,
            yCoordPtr / yCoords.BYTES_PER_ELEMENT + yCoords.length
        )
    );

    // Zip it all back up
    let returnVal = transXCoords.map(function (x, i) {
        return [x, transYCoords[i]];
    });

    // Clear memory
    Module._free(xCoordPtr);
    Module._free(yCoordPtr);
    Module.ccall('OSRDestroySpatialReference', 'number', ['number'], [sourceSrs]);
    Module.ccall('OSRDestroySpatialReference', 'number', ['number'], [targetSrs]);
    Module.ccall('OCTDestroyCoordinateTransformation', 'number', ['number'], [coordTransform]);
    return returnVal;
}
