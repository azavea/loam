/* global describe, it, before */

import chai from 'chai';
import {open, GDALDataset } from '../lib/loam.js';

chai.expect();

const expect = chai.expect;

describe('Given that loam exists', () => {
    before(() => {
        // Nothing
    });
    describe('calling open', () => {
        it('should return a GDALDataset', () => {
            expect(open()).to.be.an.instanceof(GDALDataset);
        });
    });
});
