import randomKey from '../wRandomKey.js';
import strArrayToCharPtrPtr from '../stringArrayToCharPtrPtr.js';
import VRT from '../vrt.js';
import SourceFile from '../sourceFile.js';
import throwIfError from '../throwIfError.js';

/* global Module FS WORKERFS */
export default function (GDALOpen, errorHandling, rootPath) {
    return function (file) {
        // TODO: Use the throwIfError helper here (may need multiple cleanup functions?)
        let sourceDir;
        let sourcePathPtr;
        let frees;
        let vrtDir;
        let vrtDs;
        let vrtPath;
        let testDs;
        const cleanup = function () {
            if (typeof testDs !== 'undefined' && testDs !== 0) {
                Module.ccall('GDALClose', null, ['number'], [testDs]);
            }
            if (typeof vrtDs !== 'undefined' && vrtDs !== 0) {
                Module.ccall('GDALClose', null, ['number'], [vrtDs]);
            }
            if (typeof vrtDs !== 'undefined') {
                FS.unlink(vrtPath);
            }
            FS.unmount(sourceDir);
            FS.rmdir(sourceDir);
            if (typeof sourcePathPtr !== 'undefined' && sourcePathPtr !== 0) {
                Module._free(sourcePathPtr);
            }
            if (typeof frees !== 'undefined') {
                frees.forEach(ptr => Module._free(ptr));
            }
            FS.rmdir(vrtDir);
        };

        const sourceDirName = randomKey();
        const vrtDirName = randomKey();

        sourceDir = rootPath + '/' + sourceDirName;
        vrtDir = rootPath + '/' + vrtDirName;
        let sourceName;

        FS.mkdir(sourceDir);
        FS.mkdir(vrtDir);

        if (file instanceof File) {
            sourceName = file.name;
            FS.mount(WORKERFS, { files: [file] }, sourceDir);
        } else if (file instanceof Blob) {
            sourceName = randomKey(8) + 'geotiff.tif';
            FS.mount(WORKERFS, { blobs: [{ name: sourceName, data: file }] }, sourceDir);
        }
        const sourcePath = sourceDir + '/' + sourceName;

        // BuildVRT only issues warnings on invalid file types, not failures, so we need to do a
        // validation stage to make sure this is a valid file.
        testDs = Module.ccall('GDALOpen', 'number', ['string'], [sourcePath]);
        throwIfError(errorHandling, cleanup);
        Module.ccall('GDALClose', null, ['number'], [testDs]);
        testDs = 0; // So that we don't try to close it again later.
        [sourcePathPtr, ...frees] = strArrayToCharPtrPtr([sourcePath], false);

        // Call BuildVRT
        const vrtName = randomKey(16) + '.vrt';

        vrtPath = vrtDir + '/' + vrtName;
        vrtDs = Module.ccall('GDALBuildVRT', 'number',
            ['string', 'number', 'number', 'number', 'number', 'number'],
            [vrtPath, 1, null, sourcePathPtr, null, null]
        );

        // Check for errors; clean up and throw if error is detected
        throwIfError(errorHandling, cleanup);
        // Read VRT to string. First close it to ensure it is written to FS
        Module.ccall('GDALClose', null, ['number'], [vrtDs]);
        vrtDs = 0; // Don't try to close it later
        const vrtText = FS.readFile(vrtPath, { encoding: 'utf8' });

        cleanup();

        // Return
        return {
            sources: [new SourceFile(sourceName, [rootPath, sourceDirName], file)],
            headVrt: new VRT(vrtName, [rootPath, vrtDirName], vrtText),
            vrtParts: []
        };
    };
}
