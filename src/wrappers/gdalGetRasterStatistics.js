/* global Module */
export default function (GDALGetRasterStatistics, errorHandling) {
    return function (datasetPtr, bandNum) {
        const bandPtr = Module.ccall(
            'GDALGetRasterBand',
            'number',
            ['number', 'number'],
            [datasetPtr, bandNum]
        );
        // We need to allocate pointers to store statistics into which will get passed into
        // GDALGetRasterStatistics(). They're all doubles, so allocate 8 bytes each.
        const minPtr = Module._malloc(8);
        const maxPtr = Module._malloc(8);
        const meanPtr = Module._malloc(8);
        const sdPtr = Module._malloc(8);
        const returnErr = GDALGetRasterStatistics(
            bandPtr,
            0, // Approximate statistics flag -- set to false
            1, // Force flag -- will always return statistics even if image must be rescanned
            minPtr,
            maxPtr,
            meanPtr,
            sdPtr
        );

        const errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; throw if error is detected
        // GDALGetRasterStatistics returns CE_Failure if an error occurs.
        try {
            if (
                errorType === errorHandling.CPLErr.CEFailure ||
                errorType === errorHandling.CPLErr.CEFatal ||
                returnErr === errorHandling.CPLErr.CEFailure
            ) {
                throw new Error(
                    'Error in GDALGetRasterStatistics: ' + errorHandling.CPLGetLastErrorMsg()
                );
            } else {
                // At this point the values at each pointer should have been written with statistics
                // so we can read them out and send them back.
                return {
                    minimum: Module.getValue(minPtr, 'double'),
                    maximum: Module.getValue(maxPtr, 'double'),
                    median: Module.getValue(meanPtr, 'double'),
                    stdDev: Module.getValue(sdPtr, 'double'),
                };
            }
        } finally {
            Module._free(minPtr);
            Module._free(maxPtr);
            Module._free(meanPtr);
            Module._free(sdPtr);
        }
    };
}
