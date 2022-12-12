import { initWorker, clearWorker, runOnWorker } from './workerCommunication.js';
import { DatasetSource, GDALDataset } from './gdalDataset.js';

function open(file, sidecars = []) {
    return new Promise((resolve, reject) => {
        const ds = new GDALDataset(new DatasetSource('GDALOpen', file, sidecars));

        return ds.open().then(
            () => resolve(ds),
            (reason) => reject(reason)
        );
    });
}

function rasterize(geojson, args) {
    return new Promise((resolve, reject) => {
        resolve(new GDALDataset(new DatasetSource('GDALRasterize', geojson, [], args)));
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

function initialize(loamPrefix, gdalPrefix) {
    return initWorker(loamPrefix, gdalPrefix);
}

function reset() {
    return clearWorker();
}

export { open, rasterize, initialize, reset, reproject };
