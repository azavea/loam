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
        this.timeout(6000);
        it('should return a GDALDataset', () => {
            return xhrAsPromiseBlob(tinyTifPath).then((tifBlob) => loam.open(tifBlob).then((ds) => {
                expect(ds).to.be.an.instanceof(loam.GDALDataset);
                expect(ds.datasetPtr).to.be.a('number', 'datasetPtr was not a number');
                expect(ds.datasetPtr).not.to.equal(0, 'datasetPtr was 0 (null)');
                expect(ds.filePath).to.equal('/tiffs/geotiff.tif', 'filePath didn\'t match parameter to open()');
            }));
        });
    });

    describe('calling open with a File', function () {
        it('should return a GDALDataset');
    });

    describe('calling close', function() {
        this.timeout(6000);
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
