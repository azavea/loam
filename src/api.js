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

export { open, initialize };
