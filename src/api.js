import { initWorker, runOnWorker } from './workerCommunication.js';
import { GDALDataset } from './gdalDataset.js';

function open(file) {
    return new Promise((resolve, reject) => {
        const ds = new GDALDataset(file);

        return ds.open().then(() => resolve(ds), (reason) => reject(reason));
    });
}

function reproject(fromCRS, toCRS, coords) {
    var xCoords = new Float64Array(coords.map(function (pair) { return pair[0]; }));
    var yCoords = new Float64Array(coords.map(function (pair) { return pair[1]; }));

    return runOnWorker('LoamReproject', [fromCRS, toCRS, xCoords, yCoords]);
}

function initialize(pathPrefix) {
    return initWorker(pathPrefix);
}

export { open, initialize, reproject };
