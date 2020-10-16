/* global Module, FS, MEMFS */
import randomKey from '../randomKey.js';
import guessFileExtension from '../guessFileExtension.js';
import ParamParser from '../stringParamAllocator.js';

export default function (GDALRasterize, errorHandling, rootPath) {
    return function (geojson, args) {
        let params = new ParamParser(args);

        // Make a temporary file location to hold the geojson
        const geojsonPath = rootPath + randomKey() + '.geojson';

        FS.writeFile(geojsonPath, JSON.stringify(geojson));
        // Append the geojson path to the args so that it's read as the source.
        // Open the geojson using GDALOpenEx, which can handle non-raster sources.
        const datasetPtr = Module.ccall('GDALOpenEx', 'number', ['string'], [geojsonPath]);

        params.allocate();

        // Whew, all finished. argPtrsArrayPtr is now the address of the start of the list of
        // pointers in Emscripten heap space. Each pointer identifies the address of the start of a
        // parameter string, also stored in heap space. This is the direct equivalent of a char **,
        // which is what GDALRasterizeOptionsNew requires.
        let rasterizeOptionsPtr = Module.ccall(
            'GDALRasterizeOptionsNew',
            'number',
            ['number', 'number'],
            [params.argPtrsArrayPtr, null]
        );

        // Validate that the options were correct
        let optionsErrType = errorHandling.CPLGetLastErrorType();

        if (
            optionsErrType === errorHandling.CPLErr.CEFailure ||
            optionsErrType === errorHandling.CPLErr.CEFatal
        ) {
            Module.ccall('GDALClose', 'number', ['number'], datasetPtr);
            FS.unlink(geojsonPath);
            params.deallocate();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALRasterize: ' + message);
        }

        // Now that we have our translate options, we need to make a file location to hold the
        // output.
        let directory = rootPath + randomKey();

        FS.mkdir(directory);
        // This makes it easier to remove later because we can just unmount rather than recursing
        // through the whole directory structure.
        FS.mount(MEMFS, {}, directory);
        let filename = randomKey(8) + '.' + guessFileExtension(args);

        let filePath = directory + '/' + filename;

        // And then we can kick off the actual warping process.
        // TODO: The last parameter is an int* that can be used to detect certain kinds of errors,
        // but I'm not sure how it works yet and whether it gives the same or different information
        // than CPLGetLastErrorType
        // We can get some error information out of the final pbUsageError parameter, which is an
        // int*, so malloc ourselves an int and set it to 0 (False)
        let usageErrPtr = Module._malloc(Int32Array.BYTES_PER_ELEMENT);

        Module.setValue(usageErrPtr, 0, 'i32');

        let newDatasetPtr = GDALRasterize(
            filePath, // Output
            0, // NULL because filePath is not NULL
            datasetPtr,
            rasterizeOptionsPtr,
            usageErrPtr
        );

        let errorType = errorHandling.CPLGetLastErrorType();
        // If we ever want to use the usage error pointer:
        // let usageErr = Module.getValue(usageErrPtr, 'i32');

        // The final set of cleanup we need to do, in a function to avoid writing it twice.
        function cleanUp() {
            Module.ccall('GDALClose', 'number', ['number'], datasetPtr);
            FS.unlink(geojsonPath);
            Module.ccall('GDALRasterizeOptionsFree', null, ['number'], [rasterizeOptionsPtr]);
            Module._free(usageErrPtr);
            params.deallocate();
        }

        // Check for errors; clean up and throw if error is detected
        if (
            errorType === errorHandling.CPLErr.CEFailure ||
            errorType === errorHandling.CPLErr.CEFatal
        ) {
            cleanUp();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALRasterize: ' + message);
        } else {
            const result = {
                datasetPtr: newDatasetPtr,
                filePath: filePath,
                directory: directory,
                filename: filename,
            };

            cleanUp();
            return result;
        }
    };
}
