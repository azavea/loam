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
    .then((width) => /* do stuff with width */);
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

### `loam.rasterize(geojson, args)`
Burns vectors in GeoJSON format into rasters. This is the equivalent of the [gdal_rasterize](https://gdal.org/programs/gdal_rasterize.html) command.

**Note**: This returns a new `GDALDataset` object but does not perform any immediate calculation. Instead, calls to `.rasterize()` are evaluated lazily (as with `convert()` and `warp()`, below). The rasterization operation is only evaluated when necessary in order to access some property of the dataset, such as its size, bytes, or band count. Successive calls to `.warp()` and `.convert()` can be lazily chained onto datasets produced via `loam.rasterize()`.
#### Parameters
- `geojson`: A Javascript object (_not_ a string) in [GeoJSON](https://en.wikipedia.org/wiki/GeoJSON) format. 
- `args`: An array of strings, each representing a single command-line argument accepted by the `gdal_rasterize` command. The `src_datasource` and `dst_filename` parameters should be omitted; these are handled internally by Loam. Example (assuming you have a properly structured GeoJSON object): `loam.rasterize(geojson, ['-burn', '1.0', '-of', 'GTiff', '-ts', '200', '200'])`
#### Return value
A promise that resolves to a new `GDALDataset`.

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
This used to be required in order to avoid memory leaks in earlier versions of Loam, but is currently a no-op. It has been maintained to preserve backwards compatibility, but has no effect other than to display a console warning.
#### Return value
A promise that resolves immediately with an empty list (for historical reasons).

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

**Note**: This returns a new `GDALDataset` object but does not perform any immediate calculation. Instead, calls to `.convert()` and `.warp()` are evaluated lazily. Each successive call to `.convert()` or `.warp()` is stored in a list of operations on the dataset object. These operations are only evaluated when necessary in order to access some property of the dataset, such as its size, bytes, or band count.
#### Parameters
- `args`: An array of strings, each representing a single command-line argument accepted by the `gdal_translate` command. The `src_dataset` and `dst_dataset` parameters should be omitted; these are handled by `GDALDataset`. Example: `ds.convert(['-outsize', '200%', '200%'])`
#### Return value
A promise that resolves to a new `GDALDataset`.

<br />

### `GDALDataset.warp(args)`
Image reprojection and warping utility. This is the equivalent of the [gdalwarp](https://gdal.org/programs/gdalwarp.html) command.

**Note**: This returns a new `GDALDataset` object but does not perform any immediate calculation. Instead, calls to `.convert()` and `.warp()` are evaluated lazily. Each successive call to `.convert()` or `.warp()` is stored in a list of operations on the dataset object. These operations are only evaluated when necessary in order to access some property of the dataset, such as its size, bytes, or band count.
#### Parameters
- `args`: An array of strings, each representing a single [command-line argument](https://gdal.org/programs/gdalwarp.html#synopsis) accepted by the `gdalwarp` command. The `srcfile` and `dstfile` parameters should be omitted; these are handled by `GDALDataset`. Example: `ds.warp(['-s_srs', 'EPSG:3857', '-t_srs', 'EPSG:4326'])`
#### Return value
A promise that resolves to a new `GDALDataset`.

# Developing

After cloning,
1. `yarn install`
2. `yarn dev` and in another session `yarn test:watch`

Built assets are placed in `lib`.
