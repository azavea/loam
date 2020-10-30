export default function (GDALGetRasterYSize, errorHandling) {
    return function (datasetPtr) {
        let result = GDALGetRasterYSize(datasetPtr);

        let errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            let message = errorHandling.CPLGetLastErrorMsg();

            throw Error('Error in GDALGetRasterYSize: ' + message);
        } else {
            return result;
        }
    };
}
