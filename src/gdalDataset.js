import { callWorker } from './workerCommunication.js';

// Alias to tell GDALTranslate (and perhaps eventually GDALWarp?) to return file bytes only, rather
// than a VRT package.
const NO_VRT = false;

export default class GDALDataset {
    constructor(sources, headVrt, vrtParts) {
        // The sources for this Dataset: Blob, File, or String
        this.sources = sources;
        // The VRT string that defines the Dataset
        this.headVrt = headVrt;
        // Array of VRTs that are subcomponents of this Dataset; all files referenced in
        // headVrt need to be present here.
        this.vrtParts = vrtParts;
    }

    asFormat(formatStr, createOpts = {}) {
        const fmtArgs = ['-of', formatStr];
        const args = Object.entries(createOpts).reduce(
            (([k, v], argArray) => argArray.concat(['-co', `${k}=${v}`])),
            fmtArgs
        );

        return callWorker(
            'GDALTranslate',
            [this.headVrt, this.vrtParts, this.sources, args, NO_VRT]
        );
    }

    count() {
        return callWorker('GDALGetRasterCount', [this.headVrt, this.vrtParts, this.sources]);
    }

    width() {
        return callWorker('GDALGetRasterXSize', [this.headVrt, this.vrtParts, this.sources]);
    }

    height() {
        return callWorker('GDALGetRasterYSize', [this.headVrt, this.vrtParts, this.sources]);
    }

    wkt() {
        return callWorker('GDALGetProjectionRef', [this.headVrt, this.vrtParts, this.sources]);
    }

    transform() {
        return callWorker('GDALGetGeoTransform', [this.headVrt, this.vrtParts, this.sources]);
    }

    _guardInvalidArgs(args) {
        if (args.indexOf('-of') >= 0) {
            throw new Error('The -of parameter is not supported; please use dataset.asFormat().');
        }
        if (args.filter(arg => typeof arg !== 'string').length > 0) {
            throw new Error('Arguments must be an array of strings.');
        }
    }

    convert(args) {
        this._guardInvalidArgs(args); // Will throw
        return callWorker('GDALTranslate', [this.headVrt, this.vrtParts, this.sources, args]).then(
            function (translateResult) {
                return new GDALDataset(
                    translateResult.sources,
                    translateResult.headVrt,
                    translateResult.vrtParts
                );
            },
            function (error) { throw error; }
        );
    }

    warp(args) {
        this._guardInvalidArgs(args); // Will throw
        return callWorker('GDALWarp', [this.headVrt, this.vrtParts, this.sources, args]).then(
            function (warpResult) {
                return new GDALDataset(
                    warpResult.sources,
                    warpResult.headVrt,
                    warpResult.vrtParts
                );
            },
            function (error) { throw error; }
        );
    }
}
