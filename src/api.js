import GDALDataset from './gdalDataset.js';

function open() {
    return new GDALDataset({});
}

export { open };
