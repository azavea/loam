import callGDAL from './workerCommunication.js';

export default class GDALDataset {
    constructor(datasetPtr, filePath) {
        this.datasetPtr = datasetPtr;
        this.filePath = filePath;
    }

    close() {
        return callGDAL('GDALClose', [this.datasetPtr, this.filePath]).finally(() => {
            this.datasetPtr = null;
            this.filePath = null;
        });
    }
}
