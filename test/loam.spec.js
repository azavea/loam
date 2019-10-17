/* global describe, it, before, expect, loam */
const tinyTifPath = '/base/test/assets/tiny.tif';
const invalidTifPath = 'base/test/assets/not-a-tiff.bytes';

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
        // This is hard because it's tough to construct a real file without an
        // actual web browser to click a file-select input.
        it('should return a GDALDataset');
    });

    describe('calling open with a URL', function () {
        // This is really hard because Karma won't do HEAD or RANGE requests.
        it('should return a GDALDataset');
    });

    describe('calling mosaic() with multiple datasets', function () {
        it('should return a dataset with the sum of the vrts and sources of the constituents', () => {
            function dsPromise() {
                return xhrAsPromiseBlob(tinyTifPath).then((tifBlob) => loam.open(tifBlob));
            }
            return Promise.all([dsPromise(), dsPromise()])
                .then((datasets) => loam.mosaic(datasets))
                .then((mosaicDs) => {
                    expect(mosaicDs.sources.length).to.equal(2);
                    expect(mosaicDs.vrtParts.length).to.equal(2);
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

    describe('calling asFormat()', function () {
        it('should succeed and return bytes', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.asFormat('GTiff'))
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

    describe('calling convert', function () {
        it('should increase the number of parts of the dataset by 1', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-outsize', '200%', '200%']))
                .then(ds => ds.convert(['-outsize', '50%', '50%']))
                .then(ds => ds.convert(['-outsize', '200%', '200%']))
                .then(ds => ds.convert(['-outsize', '50%', '50%']))
                .then(ds => expect(ds.vrtParts.length).to.equal(4)); // The number of convert calls
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

    describe('calling warp', function () {
        it('should increase the number of parts of the dataset by 1', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:4326']))
                .then(ds => ds.warp(['-s_srs', 'EPSG:4326', '-t_srs', 'EPSG:3857']))
                .then(ds => ds.warp(['-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:4326']))
                .then(ds => ds.warp(['-s_srs', 'EPSG:4326', '-t_srs', 'EPSG:3857']))
                .then(ds => expect(ds.vrtParts.length).to.equal(4)); // The number of convert calls
        });
    });
    /*
    *   Failure case
    */
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

    describe('calling convert with an out format', function () {
        it('should fail and raise a warning', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-of', 'PNG']))
                .then(
                    () => {
                        throw new Error('GDALTranslate promise should have been rejected');
                    },
                    error => expect(error.message).to.include('The -of parameter is not supported')
                );
        });
    });

    describe('calling convert with non-string arguments', function () {
        it('should fail and raise a helpful warning', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.convert(['-outsize', 50, 50]))
                .then(
                    () => {
                        throw new Error('GDALTranslate promise should have been rejected');
                    },
                    error => expect(error.message).to.include('Arguments must be an array of strings.')
                );
        });
    });

    describe('calling warp with invalid arguments', function () {
        it('should fail and return an error message', function () {
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

    describe('calling warp with an out format', function () {
        it('should fail and raise a warning', function () {
            return xhrAsPromiseBlob(tinyTifPath)
                .then(tifBlob => loam.open(tifBlob))
                .then(ds => ds.warp(['-of', 'PNG']))
                .then(
                    () => {
                        throw new Error('GDALWarp promise should have been rejected');
                    },
                    error => expect(error.message).to.include('The -of parameter is not supported')
                );
        });
    });
});
