import randomKey from '../randomKey.js';

// Redefine constants from https://github.com/OSGeo/gdal/blob/v2.4.4/gdal/gcore/gdal.h
// Constants are hard to get Emscripten to output in a way that we can usefully reference from
// Javascript.
const GDAL_OF_UPDATE = 0x01;
const GDAL_OF_VERBOSE_ERROR = 0x40;

/* global FS WORKERFS */
export default function (GDALOpenEx, errorHandling, rootPath) {
    return function (file, args = [], sidecars = []) {
        let filename;

        const directory = rootPath + randomKey();

        FS.mkdir(directory);

        if (file instanceof File) {
            filename = file.name;
            FS.mount(WORKERFS, { files: [file, ...sidecars] }, directory);
        } else if (file instanceof Blob) {
            filename = 'dataset';
            FS.mount(WORKERFS, { blobs: [{ name: filename, data: file }, ...sidecars] }, directory);
        } else if (file instanceof Object && 'name' in file && 'data' in file) {
            filename = file.name;
            FS.mount(
                WORKERFS,
                { blobs: [{ name: filename, data: file.data }, ...sidecars] },
                directory
            );
        }
        const filePath = directory + '/' + filename;

        const datasetPtr = GDALOpenEx(
            filePath,
            // Open for update by default. We don't currently provide users a way to control this
            // externally and the default is read-only.
            GDAL_OF_UPDATE | GDAL_OF_VERBOSE_ERROR,
            null,
            null,
            null
        );

        const errorType = errorHandling.CPLGetLastErrorType();

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            FS.unmount(directory);
            FS.rmdir(directory);
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALOpen: ' + message);
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
