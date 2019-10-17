/* global FS WORKERFS */
export function assembleDatasetFiles(headVrt, vrtParts, sources) {
    // First the sources
    sources.map(function (src) {
        FS.mkdir(src.dirPath);

        if (src.source instanceof File) {
            FS.mount(WORKERFS, { files: [src.source] }, src.dirPath);
        } else if (src.source instanceof Blob) {
            FS.mount(WORKERFS, { blobs: [{ name: src.localname, data: src.source }] }, src.dirPath);
        } else if (typeof src.source === 'string' && src.source.startsWith('http')) {
            FS.createLazyFile(src.dirPath, src.localname, src.source, true, true);
        }
    });

    // Next the vrt parts; pretty similar except we have to dump the string contents to files
    vrtParts.map(function (vrt) {
        FS.mkdir(vrt.dirPath);
        FS.writeFile(vrt.fullPath, vrt.text);
    });

    // Last the headVrt, which is the same as the others. We could do this as part of the previous
    // step but I just wanted to make it clear that this one is special.
    FS.mkdir(headVrt.dirPath);
    FS.writeFile(headVrt.fullPath, headVrt.text);
}

export function wipeDatasetFiles(headVrt, vrtParts, sources) {
    // Now we do it in reverse order compared to create; this isn't strictly necessary but it keeps
    // the dependencies clear
    FS.unlink(headVrt.fullPath);
    FS.rmdir(headVrt.dirPath);

    vrtParts.map(function (vrt) {
        FS.unlink(vrt.fullPath);
        FS.rmdir(vrt.dirPath);
    });

    sources.map(function (src) {
        const sourceDirInfo = FS.lookupPath(src.dirPath);

        // It's a plain directory
        if (sourceDirInfo.node.mount.mountpoint === '/') {
            FS.unlink(src.fullPath);
        } else { // There's a device mounted there
            FS.unmount(src.dirPath);
        }
        // And now we can remove it.
        FS.rmdir(src.dirPath);
    });
}