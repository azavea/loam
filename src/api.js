import { initWorker, clearWorker, runOnWorker } from './workerCommunication.js';
import { GDALDataset } from './gdalDataset.js';

function open(file) {
    return new Promise((resolve, reject) => {
        const ds = new GDALDataset({ func: 'GDALOpen', src: file, args: [] });

        return ds.open().then(
            () => resolve(ds),
            (reason) => reject(reason)
        );
    });
}

function rasterize(geojson, args) {
    return new Promise((resolve, reject) => {
        resolve(new GDALDataset({ func: 'GDALRasterize', src: geojson, args: args }));
    });
}

function reproject(fromCRS, toCRS, coords) {
    var xCoords = new Float64Array(
        coords.map(function (pair) {
            return pair[0];
        })
    );
    var yCoords = new Float64Array(
        coords.map(function (pair) {
            return pair[1];
        })
    );

    return runOnWorker('LoamReproject', [fromCRS, toCRS, xCoords, yCoords]);
}

function initialize(pathPrefix) {
    return initWorker(pathPrefix);
}

function reset() {
    return clearWorker();
}

export { open, rasterize, initialize, reset, reproject };
