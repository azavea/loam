import { GDALDataTypes } from '../gdalDataType.js';

/* global Module */
export default function (GDALGetRasterDataType, errorHandling) {
    return function (datasetPtr, bandNum) {
        const bandPtr = Module.ccall(
            'GDALGetRasterBand',
            'number',
            ['number', 'number'],
            [datasetPtr, bandNum]
        );
        // GDALGetRasterDataType will provide an integer because it's pulling from an enum
        // So we use that to index into an array of the corresponding type strings so that it's
        // easier to work with from Javascript land.
        const result = GDALDataTypes[GDALGetRasterDataType(bandPtr)];

        const errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            throw new Error(
                'Error in GDALGetRasterDataType: ' + errorHandling.CPLGetLastErrorMsg()
            );
        } else {
            return result;
        }
    };
}
