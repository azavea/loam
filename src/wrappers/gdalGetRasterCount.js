export default function (GDALGetRasterCount, errorHandling) {
    return function (datasetPtr) {
        let result = GDALGetRasterCount(datasetPtr);
        let errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (errorType === errorHandling.CPLErr.CEFailure ||
                errorType === errorHandling.CPLErr.CEFatal) {
            let message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        } else {
            return result;
        }
    };
}
