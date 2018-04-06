export default function guessFileExtension(args) {
    const supportedFormats = {
        PNG: 'png',
        JPEG: 'jpg',
        GTiff: 'tif'
    };

    // Match GDAL 2.1 behavior: if output format is unspecified, the output format is GeoTiff
    // This changes to auto-detection based on extension in GDAL 2.3, so if/when we upgrade to that,
    // this will need to be changed.
    if (!args.includes('-of')) {
        return 'tif';
    }
    // Otherwise, try to guess the format from the arguments; this isn't meant for validation, just
    // to provide a reasonable filename if it ever ends up getting exposed to the user.
    let formatStr = args[args.indexOf('-of') + 1];

    if (Object.keys(supportedFormats).includes(formatStr)) {
        return supportedFormats[formatStr];
    }
    // If the next parameter after `-of` isn't in our supported formats, then the user is trying
    // to specify a format that's not supported by gdal-js, or their gdal_translate arguments
    // array is malformed. Either way, it's not really this function's business to validate
    // that, so just return the best guess as to what the user might have intended. Any errors
    // will be handled by the main function's error handling code.
    return formatStr;
}
