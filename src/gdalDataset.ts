import { accessFromDataset } from './workerCommunication.js';

type Args = (string | undefined | Args)[];

// A function, to be executed within the GDAL webworker context, that outputs a dataset.
export class DatasetOperation {
    func: string;
    args: Args;

    constructor(functionName: string, args: Args) {
        this.func = functionName;
        this.args = args;
    }
}

type Mode = 'hillshade' | 'slope' | 'aspect' | 'color-relief' | 'TRI' | 'TPI' | 'roughness';
type Colors<M extends Mode> = M extends 'color-relief' ? string[] : never;

export class GDALDataset {
    source: string;
    operations: readonly DatasetOperation[];

    constructor(source: string, operations: readonly DatasetOperation[]) {
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

    convert(args: string[]) {
        return new Promise((resolve) => {
            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALTranslate', args))
                )
            );
        });
    }

    warp(args: string[]) {
        return new Promise((resolve) => {
            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALWarp', args))
                )
            );
        });
    }

    render<M extends Mode>(mode: M, args: Args, colors?: Colors<M>) {
        return new Promise((resolve) => {
            // DEMProcessing requires an auxiliary color definition file in some cases, so the API
            // can't be easily represented as an array of strings. This packs the user-friendly
            // interface of render() into an array that the worker communication machinery can
            // easily make use of. It'll get unpacked inside the worker. Yet another reason to use
            // something like comlink (#49)
            const cliOrderArgs: Args = [mode, colors, ...args];

            resolve(
                new GDALDataset(
                    this.source,
                    this.operations.concat(new DatasetOperation('GDALDEMProcessing', cliOrderArgs))
                )
            );
        });
    }

    close() {
        return new Promise((resolve) => {
            const warningMsg =
                'It is not necessary to call close() on a Loam dataset. This is a no-op';

            console.warn(warningMsg);
            resolve([]);
        });
    }
}
