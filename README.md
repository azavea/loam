A wrapper for running GDAL in the browser using [gdal-js](https://github.com/ddohler/gdal-js/)

[![Build Status](https://travis-ci.org/azavea/loam.svg?branch=develop)](https://travis-ci.org/azavea/loam)

# Developing

1. `yarn install`
2. `yarn dev` and in another session `yarn test:watch`

Built libraries are placed in `lib`.

# Basic usage

```javascript
// Assuming you have a `Blob` object from somewhere. `File` objects also work
loam.open(blob).then((dataset) => {
  dataset.width()
    .then((width) => /* do stuff with width */)
    .then(() => dataset.close()); // It's important to close datasets after you're done with them
  // Available functions on dataset are:
  // - width()
  // - height()
  // - transform() (returns in GDAL ordering, not affine transform ordering)
  // - wkt()
  // - count() (returns number of bands)
});
```
Further examples are available in the tests.

To install, make `loam.min.js` web-accessible or include it in your bundle. Then,
make sure the following are web-accessible from the same path (but NOT included in
your bundle):
- loam-worker.min.js
- [gdal.js](https://www.npmjs.com/package/gdal-js)
- [gdal.wasm](https://www.npmjs.com/package/gdal-js)
- [gdal.data](https://www.npmjs.com/package/gdal-js)
