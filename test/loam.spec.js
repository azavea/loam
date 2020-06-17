/* global describe, it, before, afterEach, expect, loam */
const tinyTifPath = '/base/test/assets/tiny.tif';
const invalidTifPath = 'base/test/assets/not-a-tiff.bytes';
const epsg4326 = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]';
const epsg3857 = 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs"],AUTHORITY["EPSG","3857"]]';

function xhrAsPromiseBlob(url) {
    let xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    xhr.responseType = 'blob';
    return new Promise(function (resolve, reject) {
        xhr.onload = function (oEvent) {
            resolve(xhr.response);
        };
        xhr.onerror = function (oEvent) {
            reject(oEvent);
        };
        xhr.send();
    });
}

describe('Given that loam exists', () => {
    before(function () {
        this.timeout(15000);
        return loam.initialize();
    });

    describe('calling open with a Blob', function () {
        it('should return a GDALDataset', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => {
                    expect(ds).to.be.an.instanceof(loam.GDALDataset);
                });
        });
    });

    describe('calling open with a File', function () {
        it('should return a GDALDataset');
    });

    describe('calling reproject()', function () {
        it('should reproject points from one CRS to another', () => {
            return loam.reproject(epsg4326, epsg3857, [
                [-75.1652, 39.9526],
                [44.8271, 41.7151],
                [-47.9218, -15.8267]
            ]).then((coords) => {
                expect(coords).to.deep.equal([
                    [-8367351.7893745685, 4859056.629543971],
                    [4990129.945739155, 5118397.8827427635],
                    [-5334630.373897098, -1784662.322609764]
                ]);
            });
        });
    });

    describe('calling count()', function () {
        it('should return the number of bands in the GeoTiff', () => {
            return xhrAsPromiseBlob(tinyTifPath).then((tifBlob) => loam.open(tifBlob).then((ds) => {
                return ds.count().then((count) => expect(count).to.equal(1));
            }));
        });
    });

    describe('calling width()', function () {
        it('should return the x-size of the GeoTiff', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => ds.width())
                .then((width) => expect(width).to.equal(15));
        });
    });

    describe('calling height()', function () {
        it('should return the y-size of the GeoTiff', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => ds.height())
                .then((height) => expect(height).to.equal(16));
        });
    });

    describe('calling wkt()', function () {
        it('should return the GeoTiff\'s WKT CRS string', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => ds.wkt())
                .then((wkt) => {
                    expect(wkt).to.equal(
                        'PROJCS["unnamed",' +
                            'GEOGCS["unnamed ellipse",' +
                                'DATUM["unknown",' +
                                    'SPHEROID["unnamed",6378137,0]],' +
                                'PRIMEM["Greenwich",0],' +
                                'UNIT["degree",0.0174532925199433]],' +
                            'PROJECTION["Mercator_1SP"],' +
                            'PARAMETER["central_meridian",0],' +
                            'PARAMETER["scale_factor",1],' +
                            'PARAMETER["false_easting",0],' +
                            'PARAMETER["false_northing",0],' +
                            'UNIT["metre",1,' +
                                'AUTHORITY["EPSG","9001"]]]'
                    );
                });
        });
    });

    describe('calling transform()', function () {
        it('should return the GeoTiff\'s 6-element GDAL transform array', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => ds.transform())
                .then((transform) => {
                    expect(transform).to.deep.equal([
                        -8380165.213197844, 2416.6666666666665, 0,
                        4886134.645645497, 0, -2468.75
                    ]);
                });
        });
    });

    describe('calling close', function () {
        it('should succeed and clear the GDALDataset', function () {
            return xhrAsPromiseBlob(tinyTifPath).then(tifBlob => {
                return loam.open(tifBlob).then(ds => {
                    return ds.close().then(result => {
                        expect(result).to.deep.equal([]);
                    });
                });
            });
        });
    });

    describe('calling bytes', function () {
        it('should succeed and return the file contents', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.bytes())
                .then(bytes => expect(bytes.length).to.equal(862));
        });
    });

    describe('calling convert', function () {
        it('should succeed and return a new Dataset with the transformed values', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-outsize', '200%', '200%']))
                .then(newDs => newDs.width())
                .then(width => expect(width).to.equal(30));
        });
    });

    describe('calling warp', function () {
        it('should succeed and return a new Dataset that has been warped', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:4326']))
                .then(newDS => newDS.transform())
                // Determined out-of-band by executing gdalwarp on the command line.
                .then(transform => {
                    expect(transform).to.deep.equal([
                        -75.2803049446235,
                        0.019340471787624117,
                        0.0,
                        40.13881222863268,
                        0.0,
                        -0.019340471787624117
                    ]);
                });
        });
    });

    /**
     * Failure cases
     **/
    describe('calling open() on an invalid file', function () {
        it('should fail and return an error message', function () {
            return xhrAsPromiseBlob(invalidTifPath)
                .then(garbage => loam.open(garbage))
                .then(
                    () => {
                        throw new Error('GDALOpen promise should have been rejected');
                    },
                    error => expect(error.message).to.include(
                        'not recognized as a supported file format'
                    )
                );
        });
    });

    describe('calling convert with invalid arguments', function () {
        it('should fail and return an error message', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-notreal', 'xyz%', 'oink%']))
                .then(ds => ds.bytes()) // Need to call an accessor to trigger operation execution
                .then(
                    (result) => {
                        throw new Error(
                            'convert() promise should have been rejected but got ' +
                            result + ' instead.'
                        );
                    },
                    error => expect(error.message).to.include(
                        'Unknown option name'
                    )
                );
        });
    });

    describe('calling warp with invalid arguments', function () {
        it('should fail and return an error message', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-s_srs', 'EPSG:Fake', '-t_srs', 'EPSG:AlsoFake']))
                .then(ds => ds.bytes()) // Need to call an accessor to trigger operation execution
                .then(
                    (result) => {
                        throw new Error(
                            'warp() promise should have been rejected but got ' +
                            result + ' instead.'
                        );
                    },
                    error => expect(error.message).to.include(
                        'Failed to lookup UOM CODE 0'
                    )
                );
        });
    });

    describe('calling convert with non-string arguments', function () {
        it('should fail and return an error message', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-outsize', 25]))
                .then(ds => ds.bytes()) // Need to call an accessor to trigger operation execution
                .then(
                    (result) => {
                        throw new Error(
                            'convert() promise should have been rejected but got ' +
                            result + ' instead.'
                        );
                    },
                    error => expect(error.message).to.include(
                        'All items in the argument list must be strings'
                    )
                );
        });
    });

    describe('calling warp with non-string arguments', function () {
        it('should fail and return an error message', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-order', 2]))
                .then(ds => ds.bytes()) // Need to call an accessor to trigger operation execution
                .then(
                    (result) => {
                        throw new Error(
                            'warp() promise should have been rejected but got ' +
                            result + ' instead.'
                        );
                    },
                    error => expect(error.message).to.include(
                        'All items in the argument list must be strings'
                    )
                );
        });
    });
});
