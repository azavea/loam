import { accessFromDataset } from './workerCommunication.js';

// A function, to be executed within the GDAL webworker context, that outputs a dataset.
export class DatasetOperation {
    constructor(functionName, args) {
        this.func = functionName;
        this.args = args;
    }
}

// The starting point of a dataset within a GDAL webworker context. Outputs a dataset.
// - functionName is the name of a GDAL function that can generate a dataset
//   Currently, this is either GDALOpen or GDALRasterize
// - file is a File, Blob, or {name: string, data: Blob}
// - sidecars are any other files that need to get loaded into the worker filesystem alongside file
//   Must match the type of file
// - args are any additional arguments that should be passed to functionName.
export class DatasetSource {
    constructor(functionName, file, sidecars = [], args = []) {
        this.func = functionName;
        this.src = file;
        this.sidecars = sidecars;
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

    layerCount() {
        return accessFromDataset('GDALDatasetGetLayerCount', this);
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
            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALTranslate', args))
                )
            );
        });
    }

    vectorConvert(args) {
        return new Promise((resolve, reject) => {
            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALVectorTranslate', args))
                )
            );
        });
    }

    warp(args) {
        return new Promise((resolve, reject) => {
            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALWarp', args))
                )
            );
        });
    }

    render(mode, args, colors) {
        return new Promise((resolve, reject) => {
            // DEMProcessing requires an auxiliary color definition file in some cases, so the API
            // can't be easily represented as an array of strings. This packs the user-friendly
            // interface of render() into an array that the worker communication machinery can
            // easily make use of. It'll get unpacked inside the worker. Yet another reason to use
            // something like comlink (#49)
            const cliOrderArgs = [mode, colors].concat(args);

            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALDEMProcessing', cliOrderArgs))
                )
            );
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            const warningMsg =
                'It is not necessary to call close() on a Loam dataset. This is a no-op';

            console.warn(warningMsg);
            resolve([]);
        });
    }
}
