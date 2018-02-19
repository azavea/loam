/* global FS */
export default function (GDALClose, tiffFolder) {
    return function (datasetPtr, filePath) {
        let result = GDALClose(datasetPtr);

        FS.unmount(filePath);
        return result;
    };
}

