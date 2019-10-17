import { initWorker, callWorker } from './workerCommunication.js';
import GDALDataset from './gdalDataset.js';

function open(file) {
    return callWorker('GDALOpen', [file]).then(
        function (openResult) {
            return new GDALDataset(
                openResult.sources,
                openResult.headVrt,
                openResult.vrtParts
            );
        },
        function (error) { throw error; }
    );
}

function initialize() {
    return initWorker();
}

function mosaic(datasets, args) {
    return callWorker('GDALBuildVRT', [datasets, args]).then(
        function (vrtResult) {
            return new GDALDataset(
                vrtResult.sources,
                vrtResult.headVrt,
                vrtResult.vrtParts
            );
        },
        function (error) { throw error; }
    );
}

export { open, initialize, mosaic };
