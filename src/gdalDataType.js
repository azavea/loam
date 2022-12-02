// In order to make enums available from JS it's necessary to use embind, which seems like
// overkill for something this small. This replicates the GDALDataType enum:
// https://gdal.org/api/raster_c_api.html#_CPPv412GDALDataType and will need to be changed
// if that enum changes. There is a smoke test that should warn us if it changes upstream.
export const GDALDataTypes = [
    'Unknown',
    'Byte',
    'UInt16',
    'Int16',
    'UInt32',
    'Int32',
    'Float32',
    'Float64',
    'CInt16',
    'CInt32',
    'CFloat32',
    'CFloat64',
    'TypeCount',
];
