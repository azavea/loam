import randomKey from '../randomKey.js';

/* global FS WORKERFS */
export default function (GDALOpen, rootPath) {
    return function (file) {
        let filename;
        let directory = rootPath + '/' + randomKey();

        FS.mkdir(directory);

        if (file instanceof File) {
            filename = file.name;
            FS.mount(WORKERFS, { files: [file] }, directory);
        } else if (file instanceof Blob) {
            filename = 'geotiff.tif';
            FS.mount(WORKERFS, { blobs: [{ name: filename, data: file }] }, directory);
        }
        let filePath = directory + '/' + filename;

        return {
            datasetPtr: GDALOpen(filePath),
            filePath: filePath,
            directory: directory,
            filename: filename
        };
    };
}
