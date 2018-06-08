export default class VRT {
    constructor(localname, paths, text) {
        // The filename that this.text should be stored in.
        this.localname = localname;
        // The path components (directories) in which the file should be created
        this.paths = paths;
        // The contents of the file at this.filename.
        this.text = text;

        // These would normally be best as getters, but those can't cross the webworker boundary,
        // so we need to instantiate them at creation time.
        this.fullPath = this.paths.concat([this.localname]).join('/');
        this.dirPath = this.paths.join('/');
    }
}

