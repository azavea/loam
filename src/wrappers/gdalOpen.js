/* global FS WORKERFS */
export default function (GDALOpen, tiffFolder) {
    return function (file) {
        let filename;

        if (file instanceof Blob) {
            filename = 'geotiff.tif';
            FS.mount(WORKERFS, { blobs: [{ name: filename, data: file }] }, tiffFolder);
        } else if (file instanceof File) {
            filename = file.name;
            FS.mount(WORKERFS, { files: [file] }, tiffFolder);
        }
        let filePath = tiffFolder + '/' + filename;

        return {
            datasetPtr: GDALOpen(filePath),
            filePath: filePath
        };
    };
}
