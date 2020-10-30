/* global Module, FS, MEMFS */
import randomKey from '../randomKey.js';
import guessFileExtension from '../guessFileExtension.js';
import ParamParser from '../stringParamAllocator.js';

// TODO: This is another good reason to switch to Typescript #55
const DEMProcessingModes = Object.freeze({
    hillshade: 'hillshade',
    slope: 'slope',
    aspect: 'aspect',
    'color-relief': 'color-relief',
    TRI: 'TRI',
    TPI: 'TPI',
    roughness: 'roughness',
});

export default function (GDALDEMProcessing, errorHandling, rootPath) {
    /* mode: one of the options in DEMProcessingModes
     * colors: Array of strings matching the format of the color file defined at
     *   https://gdal.org/programs/gdaldem.html#color-relief
     * args: Array of strings matching the remaining arguments of gdaldem, excluding output filename
     */
    return function (dataset, packedArgs) {
        // TODO: Make this unnecessary by switching to comlink or similar (#49)
        const mode = packedArgs[0];
        const colors = packedArgs[1];
        const args = packedArgs.slice(2);

        if (!mode || !DEMProcessingModes.hasOwnProperty(mode)) {
            throw new Error(`mode must be one of {Object.keys(DEMProcessingModes)}`);
        } else if (mode === DEMProcessingModes['color-relief'] && !colors) {
            throw new Error(
                'A color definition array must be provided if `mode` is "color-relief"'
            );
        } else if (mode !== DEMProcessingModes['color-relief'] && colors && colors.length > 0) {
            throw new Error(
                'A color definition array should not be provided if `mode` is not "color-relief"'
            );
        }

        // If mode is hillshade, we need to create a color file path
        let colorFilePath = null;

        if (mode === DEMProcessingModes['color-relief']) {
            colorFilePath = rootPath + randomKey() + '.txt';

            FS.writeFile(colorFilePath, colors.join('\n'));
        }
        let params = new ParamParser(args);

        params.allocate();

        // argPtrsArrayPtr is now the address of the start of the list of
        // pointers in Emscripten heap space. Each pointer identifies the address of the start of a
        // parameter string, also stored in heap space. This is the direct equivalent of a char **,
        // which is what GDALDEMProcessingOptionsNew requires.
        const demOptionsPtr = Module.ccall(
            'GDALDEMProcessingOptionsNew',
            'number',
            ['number', 'number'],
            [params.argPtrsArrayPtr, null]
        );

        // Validate that the options were correct
        const optionsErrType = errorHandling.CPLGetLastErrorType();

        if (
            optionsErrType === errorHandling.CPLErr.CEFailure ||
            optionsErrType === errorHandling.CPLErr.CEFatal
        ) {
            if (colorFilePath) {
                FS.unlink(colorFilePath);
            }
            params.deallocate();
            const message = errorHandling.CPLGetLastErrorMsg();

            throw new Error('Error in GDALDEMProcessing: ' + message);
        }

        // Now that we have our options, we need to make a file location to hold the output.
        let directory = rootPath + randomKey();

        FS.mkdir(directory);
        // This makes it easier to remove later because we can just unmount rather than recursing
        // through the whole directory structure.
        FS.mount(MEMFS, {}, directory);
        let filename = randomKey(8) + '.' + guessFileExtension(args);

        let filePath = directory + '/' + filename;

        // And then we can kick off the actual processing.
        // The last parameter is an int* that can be used to detect certain kinds of errors,
        // but I'm not sure how it works yet and whether it gives the same or different information
        // than CPLGetLastErrorType.
        // Malloc ourselves an int and set it to 0 (False)
        let usageErrPtr = Module._malloc(Int32Array.BYTES_PER_ELEMENT);

        Module.setValue(usageErrPtr, 0, 'i32');

        let newDatasetPtr = GDALDEMProcessing(
            filePath, // Output
            dataset,
            mode,
            colorFilePath,
            demOptionsPtr,
            usageErrPtr
        );

        let errorType = errorHandling.CPLGetLastErrorType();
        // If we ever want to use the usage error pointer:
        // let usageErr = Module.getValue(usageErrPtr, 'i32');

        // The final set of cleanup we need to do, in a function to avoid writing it twice.
        function cleanUp() {
            if (colorFilePath) {
                FS.unlink(colorFilePath);
            }
            Module.ccall('GDALDEMProcessingOptionsFree', null, ['number'], [demOptionsPtr]);
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

            throw new Error('Error in GDALDEMProcessing: ' + message);
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
