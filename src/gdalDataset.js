import { callWorker } from './workerCommunication.js';

export default class GDALDataset {
    constructor(datasetPtr, filePath) {
        this.datasetPtr = datasetPtr;
        this.filePath = filePath;
    }

    close() {
        return callWorker('GDALClose', [this.datasetPtr, this.filePath]).finally(() => {
            this.datasetPtr = null;
            this.filePath = null;
        });
    }

    count() {
        return callWorker('GDALGetRasterCount', [this.datasetPtr]);
    }

    width() {
        return callWorker('GDALGetRasterXSize', [this.datasetPtr]);
    }

    height() {
        return callWorker('GDALGetRasterYSize', [this.datasetPtr]);
    }

    wkt() {
        return callWorker('GDALGetProjectionRef', [this.datasetPtr]);
    }

    transform() {
        return callWorker('GDALGetGeoTransform', [this.datasetPtr]);
    }
}
