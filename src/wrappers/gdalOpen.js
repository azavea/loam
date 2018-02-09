/* global FS WORKERFS */
export default function (GDALOpen, tiffFolder) {
    return function (file) {
        FS.mount(WORKERFS, { files: [file] }, tiffFolder);
        return GDALOpen(tiffFolder + '/' + file.name);
    };
}
