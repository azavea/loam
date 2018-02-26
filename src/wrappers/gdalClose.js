/* global FS */
export default function (GDALClose) {
    return function (datasetPtr, directory) {
        GDALClose(datasetPtr);
        FS.unmount(directory);
        FS.rmdir(directory);
        return true;
    };
}

