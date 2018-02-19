export default function (GDALGetProjectionRef) {
    return function (datasetPtr) {
        return GDALGetProjectionRef(datasetPtr);
    };
}
