import randomKey from '../randomKey.js';

/* global FS WORKERFS */
export default function (GDALOpen, errorHandling, rootPath) {
    return function (file) {
        let filename;

        let directory = rootPath + randomKey();

        FS.mkdir(directory);

        if (file instanceof File) {
            filename = file.name;
            FS.mount(WORKERFS, { files: [file] }, directory);
        } else if (file instanceof Blob) {
            filename = 'geotiff.tif';
            FS.mount(WORKERFS, { blobs: [{ name: filename, data: file }] }, directory);
        }
        let filePath = directory + '/' + filename;

        let datasetPtr = GDALOpen(filePath);

        let errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            FS.unmount(directory);
            FS.rmdir(directory);
            let message = errorHandling.CPLGetLastErrorMsg();

            throw new Error(message);
        } else {
            return {
                datasetPtr: datasetPtr,
                filePath: filePath,
                directory: directory,
                filename: filename,
            };
        }
    };
}
