/* global Module */
export default function (GDALGetRasterNoDataValue, errorHandling) {
    return function (datasetPtr, bandNum) {
        const bandPtr = Module.ccall(
            'GDALGetRasterBand',
            'number',
            ['number', 'number'],
            [datasetPtr, bandNum]
        );
        const result = GDALGetRasterNoDataValue(bandPtr);

        const errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            throw new Error(
                'Error in GDALGetRasterNoDataValue: ' + errorHandling.CPLGetLastErrorMsg()
            );
        } else {
            return result;
        }
    };
}
