import callGDAL from './workerCommunication.js';
import GDALDataset from './gdalDataset.js';

function open(file) {
    return callGDAL('GDALOpen', [file]).then(
        function (pointer) { return new GDALDataset(pointer); },
        function (error) { throw error; }
    );
}

export { open };
