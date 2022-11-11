export default function (GDALDatasetGetLayerCount, errorHandling) {
    return function (datasetPtr) {
        const result = GDALDatasetGetLayerCount(datasetPtr);

        const errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALDatasetGetLayerCount: ' + message);
        } else {
            return result;
        }
    };
}
