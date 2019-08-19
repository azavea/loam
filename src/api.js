import { initWorker, callWorker } from './workerCommunication.js';
import GDALDataset from './gdalDataset.js';

function open(file) {
    return callWorker('GDALOpen', [file]).then(
        function (openResult) {
            return new GDALDataset(
                openResult.datasetPtr,
                openResult.filePath,
                openResult.directory,
                openResult.filename
            );
        },
        function (error) { throw error; }
    );
}

function reproject(fromCRS, toCRS, coords) {
    var xCoords = new Float64Array(coords.map(function (pair) { return pair[0]; }));
    var yCoords = new Float64Array(coords.map(function (pair) { return pair[1]; }));

    return callWorker('LoamReproject', [fromCRS, toCRS, xCoords, yCoords]);
}

function flushFS() {
    return callWorker('LoamFlushFS', []);
}

function initialize(pathPrefix) {
    return initWorker(pathPrefix);
}

export { open, flushFS, initialize, reproject };
