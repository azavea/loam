/* global FS */
export default function (GDALClose, errorHandling) {
    return function (datasetPtr, directory, datasetPath, returnFileBytes = false) {
        GDALClose(datasetPtr);
        let result = [];

        if (returnFileBytes) {
            result = FS.readFile(datasetPath, { encoding: 'binary' });
        }

        FS.unmount(directory);
        FS.rmdir(directory);

        let errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; throw if error is detected
        // Note that due to https://github.com/ddohler/gdal-js/issues/38 this can only check for
        // CEFatal errors in order to avoid raising an exception on GDALClose
        if (
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            let message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALClose: ' + message);
        } else {
            return result;
        }
    };
}
