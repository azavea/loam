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
        if (errorType === errorHandling.CPLErr.CEFailure ||
                errorType === errorHandling.CPLErr.CEFatal) {
            let message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        } else {
            return result;
        }
    };
}

