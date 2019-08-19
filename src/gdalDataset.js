import { callWorker } from './workerCommunication.js';

export default class GDALDataset {
    constructor(datasetPtr, filePath, directory, filename) {
        this.datasetPtr = datasetPtr;
        this.filePath = filePath;
        this.directory = directory;
        this.filename = filename;
    }

    _deleteSelf() {
        delete this.datasetPtr;
        delete this.filePath;
        delete this.directory;
        delete this.filename;
    }

    close() {
        return callWorker('GDALClose', [this.datasetPtr, this.directory, this.filePath])
            .then(
                result => {
                    this._deleteSelf();
                    return result;
                },
                reason => {
                    this._deleteSelf();
                    throw reason;
                }
            );
    }

    closeAndReadBytes() {
        return callWorker('GDALClose', [this.datasetPtr, this.directory, this.filePath, true])
            .then(result => {
                this._deleteSelf();
                return result;
            },
            reason => {
                this._deleteSelf();
                throw reason;
            });
    }

    count() {
        return callWorker('GDALGetRasterCount', [this.datasetPtr]);
    }

    width() {
        return callWorker('GDALGetRasterXSize', [this.datasetPtr]);
    }

    height() {
        return callWorker('GDALGetRasterYSize', [this.datasetPtr]);
    }

    wkt() {
        return callWorker('GDALGetProjectionRef', [this.datasetPtr]);
    }

    transform() {
        return callWorker('GDALGetGeoTransform', [this.datasetPtr]);
    }

    convert(args) {
        return callWorker('GDALTranslate', [this.datasetPtr, args]).then(
            function (translateResult) {
                return new GDALDataset(
                    translateResult.datasetPtr,
                    translateResult.filePath,
                    translateResult.directory,
                    translateResult.filename
                );
            },
            function (error) { throw error; }
        );
    }

    warp(args) {
        return callWorker('GDALWarp', [this.datasetPtr, args]).then(
            function (warpResult) {
                return new GDALDataset(
                    warpResult.datasetPtr,
                    warpResult.filePath,
                    warpResult.directory,
                    warpResult.filename
                );
            },
            function (error) { throw error; }
        );
    }

    rasterize(args) {
        return callWorker('GDALRasterize', [this.datasetPtr, args]).then(
            function (result) {
                return new GDALDataset(
                    result.datasetPtr,
                    result.filePath,
                    result.directory,
                    result.filename
                );
            },
            function (error) { throw error; }
        );
    }
}
