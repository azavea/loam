/* global describe, it, before, expect */
const tinyTifPath = '/base/test/assets/tiny.tif';

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
    afterEach(function(done) {
        loam.flushFS().then(() => done());
    });

    describe('calling open with a Blob', function() {
        // Travis seems to take 7ish seconds
        this.timeout(8000);
        it('should return a GDALDataset', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => {
                    expect(ds).to.be.an.instanceof(loam.GDALDataset);
                    expect(ds.datasetPtr).to.be.a('number', 'datasetPtr was not a number');
                    expect(ds.datasetPtr).not.to.equal(0, 'datasetPtr was 0 (null)');
                    expect(ds.filePath).to.equal('/tiffs/geotiff.tif');
                });
        });
    });

    describe('calling open with a File', function () {
        it('should return a GDALDataset');
    });

    describe('calling count()', function () {
        this.timeout(8000);
        it('should return the number of bands in the GeoTiff', () => {
            return xhrAsPromiseBlob(tinyTifPath).then((tifBlob) => loam.open(tifBlob).then((ds) => {
                return ds.count().then((count) => expect(count).to.equal(1));
            }));
        });
    });

    describe('calling width()', function () {
        this.timeout(8000);
        it('should return the x-size of the GeoTiff', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => ds.width())
                .then((width) => expect(width).to.equal(15));
        });
    });

    describe('calling height()', function () {
        this.timeout(8000);
        it('should return the y-size of the GeoTiff', () => {
            return xhrAsPromiseBlob(tinyTifPath)
                .then((tifBlob) => loam.open(tifBlob))
                .then((ds) => ds.height())
                .then((height) => expect(height).to.equal(16));
        });
    });

    describe('calling wkt()', function () {
        this.timeout(8000);
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
        this.timeout(8000);
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
        this.timeout(8000);
        it('should succeed and clear the GDALDataset', function () {
            return xhrAsPromiseBlob(tinyTifPath).then((tifBlob) => loam.open(tifBlob).then((ds) => {
                ds.close().then((result) => {
                    expect(result).to.equal(true);
                    expect(ds.datasetPtr).to.be.an('undefined');
                    expect(ds.filePath).to.be.an('undefined');
                });
            }));
        });
    });
});
