import { accessFromDataset } from './workerCommunication.js';

// A function, to be executed within the GDAL webworker context, that outputs a dataset.
export class DatasetOperation {
    constructor(functionName, args) {
        this.func = functionName;
        this.args = args;
    }
}

export class GDALDataset {
    constructor(source, operations) {
        this.source = source;
        if (operations && operations.length > 0) {
            this.operations = operations;
        } else {
            this.operations = [];
        }
    }

    // Does "nothing", but triggers the dataset to be opened and immediately closed with GDAL, which
    // will fail if the file is not a recognized format.
    open() {
        return accessFromDataset(undefined, this);
    }

    bytes() {
        return accessFromDataset('LoamReadBytes', this);
    }

    count() {
        return accessFromDataset('GDALGetRasterCount', this);
    }

    width() {
        return accessFromDataset('GDALGetRasterXSize', this);
    }

    height() {
        return accessFromDataset('GDALGetRasterYSize', this);
    }

    wkt() {
        return accessFromDataset('GDALGetProjectionRef', this);
    }

    transform() {
        return accessFromDataset('GDALGetGeoTransform', this);
    }

    convert(args) {
        return new Promise((resolve, reject) => {
            resolve(new GDALDataset(this.source, this.operations.concat(new DatasetOperation('GDALTranslate', args))));
        });
    }

    warp(args) {
        return new Promise((resolve, reject) => {
            resolve(new GDALDataset(this.source, this.operations.concat(new DatasetOperation('GDALWarp', args))));
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            const warningMsg = 'It is not necessary to call close() on a Loam dataset. This is a no-op';

            console.warn(warningMsg);
            resolve([]);
        });
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
