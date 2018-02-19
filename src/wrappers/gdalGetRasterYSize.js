export default function (GDALGetRasterYSize) {
    return function (datasetPtr) {
        return GDALGetRasterYSize(datasetPtr);
    };
}
