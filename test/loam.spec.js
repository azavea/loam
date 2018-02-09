/* global describe, it, before, expect */

describe('Given that loam exists', () => {
    before(() => {
        // Nothing
    });
    describe('calling open', function() {
        // Travis seems to take 7ish seconds
        this.timeout(15000);
        it('should return a GDALDataset', (done) => {
            let blankFile = new File(
                [],
                'blank.tif',
                {}
            );
            loam.open(blankFile).then(
                function (ds) {
                    expect(ds).to.be.an.instanceof(loam.GDALDataset);
                    done();
                },
                function (failure) {
                    done(failure);
                }
            );
        });
    });
});
