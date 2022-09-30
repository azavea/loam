A wrapper for running GDAL in the browser using [gdal-js](https://github.com/ddohler/gdal-js/)

![](https://github.com/azavea/loam/workflows/Tests/badge.svg)

# Installation
```
npm install loam
```

Assuming you are using a build system, the main `loam` library should integrate into your build the same as any other library might. However, in order to correctly initialize the Emscripten environment for running GDAL, there are other assets that need to be accessible via HTTP request at runtime, but which should _not_ be included in the main application bundle. Specifically, these are:

- `loam-worker.js`: This is the "backend" of the library; it initializes the Web Worker and translates between the Loam "frontend" and GDAL.
- [`gdal.js`](https://www.npmjs.com/package/gdal-js): This initializes the Emscripten runtime and loads the GDAL WebAssembly.
- [`gdal.wasm`](https://www.npmjs.com/package/gdal-js): The GDAL binary, compiled to WebAssembly.
- [`gdal.data`](https://www.npmjs.com/package/gdal-js): Contains configuration files that GDAL expects to find on the host filesystem.

All of these files will be included in the `node_modules` folder after running `npm install loam`, but it is up to you to integrate them into your development environment and deployment processes. Unfortunately, support for WebAssembly and Web Workers is still relatively young, so many build tools do not yet have a straightforward out-of-the-box solution that will work. However, in general, treating the four files above similarly to static assets (e.g. images, videos, or PDFs) tends to work fairly well. An example for Create React App is given below.

## Create React App
When integrating Loam with a React app that was initialized using Create React App, the simplest thing to do is probably to copy the assets above into [the `/public` folder](https://create-react-app.dev/docs/using-the-public-folder#adding-assets-outside-of-the-module-system), like so:

```
cp node_modules/gdal-js/gdal.* node_modules/loam/lib/loam-worker.js public/
```

This will cause the CRA build system to copy these files into the build folder untouched, where they can then be accessed by URL (e.g. `http://localhost:3000/gdal.wasm`).
However, this has the disadvantage that you will need to commit the copied files to source control, and they won't be updated if you update Loam. A way to work around this is to put symlinks in `/public` instead:

```
ln -s ../node_modules/loam/lib/loam-worker.js public/loam-worker.js
ln -s ../node_modules/gdal-js/gdal.wasm public/gdal.wasm
ln -s ../node_modules/gdal-js/gdal.data public/gdal.data
ln -s ../node_modules/gdal-js/gdal.js public/gdal.js

```

# API Documentation
## Basic usage

```javascript
import loam from "loam";

// Load WebAssembly and data files asynchronously. Will be called automatically by loam.open()
// but it is often helpful for responsiveness to pre-initialize because these files are fairly large. Returns a promise.
loam.initialize();

// Assuming you have a `Blob` object from somewhere. `File` objects also work.
loam.open(blob).then((dataset) => {
  dataset.width()
    .then((width) => /* do stuff with width */);
```

## Functions
### `loam.initialize(pathPrefix, gdalPrefix)`
Manually set up web worker and initialize Emscripten runtime. This function is called automatically by other functions on `loam`. Returns a promise that is resolved when Loam is fully initialized.

Although this function is called automatically by other functions, such as `loam.open()`, it is often beneficial for user experience to manually call `loam.initialize()`, because it allows pre-fetching Loam's WebAssembly assets (which are several megabytes uncompressed) at a time when the latency required to download them will be least perceptible by the user. For example, `loam.initialize()` could be called when the user clicks a button to open a file-selection dialog, allowing the WebAssembly to load in the background while the user selects a file.

This function is safe to call multiple times.
#### Parameters
- `pathPrefix` (optional): The path or URL that Loam should use as a prefix when fetching its Web Worker. If left undefined, Loam will make a best guess based on the source path of its own `<script>` element. URLs with domains may be used to enable Loam to be loaded from CDNs like unpkg, but the file name should be left off.
- `gdalPrefix` (optional): The path or URL that Loam should use as a prefix when fetching WebAssembly assets for GDAL. If left undefined, Loam will use the same value as `pathPrefix`. URLs with domains may be used to enable loading from CDNs like unpkg, but the file name should be left off. If Loam fails to work properly and you see requests resulting in 404s or other errors for the `gdal.*` assets listed above, you will need to set `pathPrefix`, or this parameter, or both, to the correct locations where Loam can find those assets.
#### Return value
A promise that resolves when Loam is initialized. All of the functions described in this document wait for this promise's resolution when executing, so paying attention to whether this promise has resolved or not is not required. However, it may be helpful to do so in some circumstances, for example, if you want to display a visual indicator that your app is ready.

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

### `loam.reset()`
Tear down Loam's internal Web Worker. This will cause initialize() to create a new Web Worker the next time it is called.

**Note**: This exists primarily to enable certain types of unit testing. It should not be necessary to call this function during normal usage of Loam. If you find that you are encountering a problem that loam.reset() solves, please [open an issue](https://github.com/azavea/loam/issues)
#### Parameters
- None
#### Return value
A promise that resolves when the Web Worker has been terminated. This function waits for initialize() to complete or fail before tearing down the worker.

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

### `GDALDataset.bytes()`
Get the on-disk representation of the dataset, as an array of bytes.
#### Return value
A promise which resolves to a Uint8Array containing the bytes of the dataset.

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

<br />

### `GDALDataset.render(mode, args, colors)`
Utility for rendering and computing DEM metrics. This is the equivalent of the [gdaldem](https://gdal.org/programs/gdaldem.html) command.

**Note**: This returns a new `GDALDataset` object but does not perform any immediate calculation. Instead, calls to `.render()` are evaluated lazily (as with `convert()` and `warp()`, above). The render operation is only evaluated when necessary in order to access some property of the dataset, such as its size, bytes, or band count. Successive calls to `.warp()` and `.convert()` can be lazily chained onto datasets produced by `.render()`, and vice-versa.
#### Parameters
- `mode`: One of ['hillshade', 'slope','aspect', 'color-relief', 'TRI', 'TPI', 'roughness']. See the [`gdaldem documentation`](https://gdal.org/programs/gdaldem.html#cmdoption-arg-mode) for an explanation of the function of each mode.
- `args`: An array of strings, each representing a single [command-line argument](https://gdal.org/programs/gdaldem.html#synopsis) accepted by the `gdaldem` command. The `inputdem` and `output_xxx_map` parameters should be omitted; these are handled by `GDALDataset`. Example: `ds.render('hillshade', ['-of', 'PNG'])`
- `colors`: If (and only if) `mode` is equal to 'color-relief', an array of strings representing lines in [the color text file](https://gdal.org/programs/gdaldem.html#color-relief). Example: `ds.render('color-relief', ['-of', 'PNG'], ['993.0 255 0 0'])`. See the [`gdaldem documentation`](https://gdal.org/programs/gdaldem.html#cmdoption-arg-color_text_file) for an explanation of the text file syntax.
#### Return value
A promise that resolves to a new `GDALDataset`.

# Developing
Yarn and NVM are required.

After cloning,
1. `nvm use`
1. `yarn install`
2. `yarn dev` and in another session `yarn test:watch`

Built assets are placed in `lib`.

## Demo page
There is a (very!) simple demo page available that utilizes Loam to print info about a GeoTIFF. To view it in a browser, run
`yarn demo`, and then navigate to http://localhost:8080/ . You can use this site for things like:

- Playing around with Loam by editing the source code in `demo/index.js`
- Validating changes that are difficult to test fully in CI

Editing Loam or the source in `demo/` should auto-reload.

# Contributing

Contributions are welcomed! Please feel free to work on any of the open issues or open an issue describing the changes you'd like to make. All contributions will be licensed under the Apache License, as per the [GitHub Terms of Service](https://docs.github.com/en/github/site-policy/github-terms-of-service#6-contributions-under-repository-license).
