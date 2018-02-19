export default function (GDALGetRasterXSize) {
    return function (datasetPtr) {
        return GDALGetRasterXSize(datasetPtr);
    };
}
