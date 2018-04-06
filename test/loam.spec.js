/* global describe, it, before, expect */
const tinyTifPath = '/base/test/assets/tiny.tif';
const invalidTifPath = 'base/test/assets/not-a-tiff.bytes';

function xhrAsPromiseBlob(url) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    return new Promise(function(resolve, reject) {
        xhr.onload = function(oEvent) {
            resolve(xhr.response);
        };
        xhr.onerror = function(oEvent) {
            reject(oEvent);
        };
        xhr.send();
    });
}


describe('Given that loam exists', () => {
    before(function() {
        this.timeout(15000);
        return loam.initialize();
    });

    afterEach(function() {
        return loam.flushFS();
    });

    describe('calling open with a Blob', function() {
        it('should return a GDALDataset', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => {
                    expect(ds).to.be.an.instanceof(loam.GDALDataset);
                    expect(ds.datasetPtr).to.be.a('number', 'datasetPtr was not a number');
                    expect(ds.datasetPtr).not.to.equal(0, 'datasetPtr was 0 (null)');
                    expect(ds.filename).to.equal('geotiff.tif');
                });
        });
    });

    describe('calling open with a File', function () {
        it('should return a GDALDataset');
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

    describe('calling close', function() {
        it('should succeed and clear the GDALDataset', function () {
            return xhrAsPromiseBlob(tinyTifPath).then(tifBlob => {
                    return loam.open(tifBlob).then(ds => {
                        return ds.close().then(result => {
                            expect(result).to.deep.equal([]);
                            expect(ds.datasetPtr).to.be.an('undefined');
                            expect(ds.filePath).to.be.an('undefined');
                        });
                    });
                });
        });
    });

    describe('calling closeAndReadBytes', function() {
        it('should succeed and return the file contents', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.closeAndReadBytes())
                .then(bytes => expect(bytes.length).to.equal(862));
        });
    });

    describe('calling convert', function() {
        it('should succeed and return a new Dataset with the transformed values', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-outsize', '200%', '200%']))
                .then(newDs => newDs.width())
                .then(width => expect(width).to.equal(30));
        });
    });

    describe('calling warp', function() {
        it('should succeed and return a new Dataset that has been warped', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:4326']))
                .then(newDS => newDS.transform())
                // Determined out-of-band by executing gdalwarp on the command line.
                .then(transform => {
                    expect(transform).to.deep.equal(
                        [-75.2803049446235,
                         0.019340471787624117,
                         0.0,
                         40.13881222863268,
                         0.0,
                         -0.019340471787624117]
                    );
                });
        });
    });

    /******************************************
     * Failure cases                          *
     ******************************************/
    describe('calling open() on an invalid file', function() {
        it('should fail and return an error message', function() {
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

    describe('calling close() on an invalid dataset', function() {
        it('should fail and return an error message', function() {
            return new loam.GDALDataset(0, 'nothing', 'nothing', 'nothing')
                .close().then(
                    (result) => {
                        throw new Error('close() promise should have been rejected' + result);
                    },
                    error => expect(error.message).to.include(
                        'No such file or directory'
                    )
                );
        });
    });

    describe('calling transform() on an invalid dataset', function() {
        it('should fail and return an error message', function() {
            return new loam.GDALDataset(0, 'nothing', 'nothing', 'nothing')
                .transform().then(
                    () => {
                        throw new Error('transform() promise should have been rejected');
                    },
                    error => expect(error.message).to.include(
                        "'hDS' is NULL in 'GDALGetGeoTransform'"
                    )
                );
        });
    });

    describe('calling wkt on an invalid dataset', function() {
        it('should fail and return an error message', function() {
            return new loam.GDALDataset(0, 'nothing', 'nothing', 'nothing')
                .wkt().then(
                    () => {
                        throw new Error('wkt() promise should have been rejected');
                    },
                    error => expect(error.message).to.include(
                        "'hDS' is NULL in 'GDALGetProjectionRef'"
                    )
                );
        });
    });

    describe('calling count on an invalid dataset', function() {
        it('should fail and return an error message', function() {
            return new loam.GDALDataset(0, 'nothing', 'nothing', 'nothing')
                .count().then(
                    () => {
                        throw new Error('count() promise should have been rejected');
                    },
                    error => expect(error.message).to.include(
                        "'hDS' is NULL in 'GDALGetRasterCount'"
                    )
                );
        });
    });

    describe('calling width on an invalid dataset', function() {
        it('should fail and return an error message', function() {
            return new loam.GDALDataset(0, 'nothing', 'nothing', 'nothing')
                .width().then(
                    () => {
                        throw new Error('width() promise should have been rejected');
                    },
                    error => expect(error.message).to.include(
                        "'hDataset' is NULL in 'GDALGetRasterXSize'"
                    )
                );
        });
    });

    describe('calling height on an invalid dataset', function() {
        it('should fail and return an error message', function() {
            return new loam.GDALDataset(0, 'nothing', 'nothing', 'nothing')
                .height().then(
                    () => {
                        throw new Error('height() promise should have been rejected');
                    },
                    error => expect(error.message).to.include(
                        "'hDataset' is NULL in 'GDALGetRasterYSize'"
                    )
                );
        });
    });

    describe('calling convert with invalid arguments', function() {
        it('should fail and return an error message', function() {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-notreal', 'xyz%', 'oink%']))
                .then(
                    (result) => {
                        throw new Error(
                            'convert() promise should have been rejected but got ' +
                            result + ' instead.'
                        );
                    },
                    error => expect(error.message).to.include(
                        "Unknown option name"
                    )
                );
        });
    });

    describe('calling warp with invalid arguments', function() {
        it('should fail and return an error message', function() {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-s_srs', 'EPSG:Fake', '-t_srs', 'EPSG:AlsoFake']))
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
});
