A wrapper for running GDAL in the browser using [gdal-js](https://github.com/ddohler/gdal-js/)

![](https://github.com/azavea/loam/workflows/Tests/badge.svg)

# Installation
```
npm install loam
```

Assuming you are using a build system, the main `loam` library should integrate into your build the same as any other library might. However, in order to correctly initialize the Emscripten environment for running GDAL, there are other assets that need to be accessible via HTTP request at runtime, but which should _not_ be included in the main application bundle. Specifically, these are:

- `loam-worker.min.js`: This is the "backend" of the library; it initializes the Web Worker and translates between the Loam "frontend" and GDAL.
- [`gdal.js`](https://www.npmjs.com/package/gdal-js): This initializes the Emscripten runtime and loads the GDAL WebAssembly.
- [`gdal.wasm`](https://www.npmjs.com/package/gdal-js): The GDAL binary, compiled to WebAssembly.
- [`gdal.data`](https://www.npmjs.com/package/gdal-js): Contains configuration files that GDAL expects to find on the host filesystem.

All of these files will be included in the `node_modules` folder after running `npm install loam`, but it is up to you to integrate them into your development environment and deployment processes.

# API Documentation
## Basic usage

```javascript
// Load WebAssembly and data files asynchronously. Will be called automatically by loam.open()
// but it is often helpful for responsiveness to pre-initialize because these files are fairly large. Returns a promise.
loam.initialize();

// Assuming you have a `Blob` object from somewhere. `File` objects also work.
loam.open(blob).then((dataset) => {
  dataset.width()
    .then((width) => /* do stuff with width */)
    .then(() => dataset.close()); // It's important to close datasets after you're done with them
```

## Functions
### `loam.initialize()`
Manually set up web worker and initialize Emscripten runtime. This function is called automatically by other functions on `loam`. Returns a promise that is resolved when Loam is fully initialized.

Although this function is called automatically by other functions, such as `loam.open()`, it is often beneficial for user experience to manually call `loam.initialize()`, because it allows pre-fetching Loam's WebAssembly assets (which are several megabytes uncompressed) at a time when the latency required to download them will be least perceptible by the user. For example, `loam.initialize()` could be called when the user clicks a button to open a file-selection dialog, allowing the WebAssembly to load in the background while the user selects a file.

This function is safe to call multiple times.

<br />

### `loam.open(file)`
Creates a new GDAL Dataset.
#### Parameters
- `file`: A Blob or File object that should be opened with GDAL. GDAL is compiled with TIFF, PNG, and JPEG support.
#### Return value
A promise that resolves with an instance of `GDALDataset`.

<br />

### `loam.reproject(fromCRS, toCRS, coords)`
Reproject coordinates from one coordinate system to another using PROJ.4.
#### Parameters
- `fromCRS`: A WKT-formatted string representing the source CRS.
- `toCRS`: A WKT-formatted string representing the destination CRS.
- `coords`: An array of [x, y] coordinate pairs.
#### Return value
A promise that resolves with an array of transformed coordinate pairs.

<br />

### `GDALDataset.close()`
Closes the dataset and cleans up its associated resources. Currently, Loam is subject to memory leaks if this function is not called to clean up unused GDALDatasets. A future goal is to eliminate the need for this.
#### Return value
A promise that resolves when the dataset has been closed and cleaned up.

<br />

### `GDALDataset.closeAndReadBytes()`
Behaves the same as `GDALDataset.close()`, except that the promise returned is resolved with the contents of the dataset, as a byte array.
#### Return value
A promise that resolves when the dataset has been closed. The promise contains the dataset contents as a byte array.

<br />

### `GDALDataset.count()`
Get the number of bands in the dataset.
#### Return value
A promise which resolves to the number of bands in the dataset.

<br />

### `GDALDataset.width()`
Get the width of the dataset, in pixels.
#### Return value
A promise which resolves to the width of the dataset, in pixels.

<br />

### `GDALDataset.height()`
Get the height of the dataset, in pixels.
#### Return value
A promise which resolves to the height of the dataset, in pixels.

<br />

### `GDALDataset.wkt()`
Get the coordinate reference system of the dataset, as a WKT-formatted string.
#### Return value
A promise which resolves with a WKT-formatted string representing the dataset's coordinate reference system.

<br />

### `GDALDataset.transform()`
Get the affine transform of the dataset, as a list of six coefficients. This allows converting between pixel coordinates and geographic coordinates. See the [GDAL documentation](https://gdal.org/user/raster_data_model.html#affine-geotransform) for further details.
#### Return value
A promise which resolves to the affine transform.

<br />

### `GDALDataset.convert(args)`
Converts raster data between different formats. This is the equivalent of the [gdal_translate](https://gdal.org/programs/gdal_translate.html) command.

**Note**: This returns a new `GDALDataset` object. It is necessary to call `.close()` on both the original dataset _and_ the new dataset in order to avoid memory leaks.
#### Parameters
- `args`: An array of strings, each representing a single command-line argument accepted by the `gdal_translate` command. The `src_dataset` and `dst_dataset` parameters should be omitted; these are handled by `GDALDataset`. Example: `ds.convert(['-outsize', '200%', '200%'])`
#### Return value
A promise that resolves to a new `GDALDataset` which has been converted according to the provided arguments to `gdal_translate`.

<br />

### `GDALDataset.warp(args)`
Image reprojection and warping utility. This is the equivalent of the [gdalwarp](https://gdal.org/programs/gdalwarp.html) command.

**Note**: This returns a new `GDALDataset` object. It is necessary to call `.close()` on both the original dataset _and_ the new dataset in order to avoid memory leaks.
#### Parameters
- `args`: An array of strings, each representing a single [command-line argument](https://gdal.org/programs/gdalwarp.html#synopsis) accepted by the `gdalwarp` command. The `srcfile` and `dstfile` parameters should be omitted; these are handled by `GDALDataset`. Example: `ds.warp(['-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:4326'])`
#### Return value
A promise that resolves to a new `GDALDataset` which has been reprojected according to the provided arguments to `gdalwarp`.

# Developing

After cloning,
1. `yarn install`
2. `yarn dev` and in another session `yarn test:watch`

Built assets are placed in `lib`.
