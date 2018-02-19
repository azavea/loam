export default function (GDALGetRasterCount) {
    return function (datasetPtr) {
        return GDALGetRasterCount(datasetPtr);
    };
}
