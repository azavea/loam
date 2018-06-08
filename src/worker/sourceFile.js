export default class SourceFile {
    constructor(localname, paths, source) {
        // The name that the source should be given inside Emscripten's "filesystem"
        this.localname = localname;
        // The path components (directories) in which the file should be placed (in file path order)
        // No slashes
        this.paths = paths;
        // The source that should be provided at localname; File, Blob, or lazy URL
        this.source = source;

        // These would normally be best as getters, but those can't cross the webworker boundary,
        // so we need to instantiate them at creation time.
        this.fullPath = this.paths.concat([this.localname]).join('/');
        this.dirPath = this.paths.join('/');
    }
}
