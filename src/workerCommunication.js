import randomKey from './randomKey.js';

let messages = {};

let workerPromise;

class LoamWorker {
    // Warning: Here be dragons.
    //
    // In order to run Loam from a CDN, we need to be able to load the worker code from an arbitrary
    // prefix, and the GDAL assets from another, potentially different, prefix, determined at
    // runtime.  The only way to instantiate a Web Worker is by providing it the URL of a Javascript
    // source file, and the only way to specify which prefix the Emscripten wrapper code uses to
    // download GDAL's assets is to set Module.locateFile from inside the Web Worker. Once the Web
    // Worker has been created, we can only communicate with it via message-passing. Therefore, if
    // we used a static file to instantiate the Web Worker, we'd have to have a multi-stage
    // initialization process, where the worker asks the main thread which URLs to use to download
    // the GDAL assets, sets Module.locateFile appropriately, loads GDAL, and then reports back to
    // the main thread that it's ready. This seems potentially error-prone because if something goes
    // wrong partway through the process, Loam could get stuck in a half-initialized state and
    // potentially would appear to simply "hang" from the user's perspective.
    //
    // Instead, we are using something of a hack: we generate a string representing Javascript
    // source, with the appropriate prefixes baked in. Then we generate a Blob from that string and
    // call URL.createObjectURL from the blob. This gives us a URL that we can use to instantiate
    // the web worker, but we have immediate control over what it does because we inject the
    // prefixes directly into the worker source code via template literals.  However, generating
    // Javascript from a string is far from optimal -- it can't be minified, linted, or type-checked
    // if we ever convert to Typescript.
    //
    // The logic in this section should be limited to functionality that absolutely must be
    // parameterized upon Worker initialization. Everything else should go in worker.js.
    constructor(loamPrefix, gdalPrefix) {
        const codeStr = `{
            // Set up most of Module, and the rest of the worker communication logic.
            importScripts('${loamPrefix}' + 'loam-worker.js');
            // Add locateFile that directs to gdalPrefix
            self.Module.locateFile = function(path) {
                return '${gdalPrefix}' + path;
            };
            // Load gdal.js. This will populate the Module object, and then call
            // Module.onRuntimeInitialized() when it is ready for user code to interact with it.
            importScripts('${gdalPrefix}' + 'gdal.js');
        }`;

        const blob = new Blob([codeStr], { type: 'application/javascript' });

        return new Worker(URL.createObjectURL(blob));
    }
}

// Cache the currently executing script at initialization so that we can use it later to figure
// out where all the other scripts should be pulled from
let _scripts = document.getElementsByTagName('script');
const THIS_SCRIPT = _scripts[_scripts.length - 1];

// Inspired by Emscripten's method for doing the same thing
function getPathPrefix() {
    const prefix = THIS_SCRIPT.src.substring(0, THIS_SCRIPT.src.lastIndexOf('/')) + '/';

    try {
        // prefix must be a valid URL so validate that it is before returning
        // eslint-disable-next-line no-new
        new URL(prefix);
        return prefix;
    } catch (error) {
        // Returning undefined will require the user to specify a valid absolute URL for loamPrefix
        // at least
        return undefined;
    }
}

// Destroy the worker and clear the promise so that calling initWorker will make a new one.
function clearWorker() {
    return new Promise(function (resolve) {
        if (workerPromise !== undefined) {
            // If a worker has been initialized, wait for it to succeed or fail. If it succeeds,
            // kill it. Then, no matter what, set the promise to undefined so that subsequent calls
            // to initialize() will spawn a new worker.
            workerPromise
                .then(function (worker) {
                    worker.terminate();
                })
                // No need to take any action if initialization fails -- initWorker() will have
                // already torn things down in that case.
                .finally(function () {
                    workerPromise = undefined;
                    resolve();
                });
        } else {
            resolve();
        }
    });
}

// Set up a WebWorker and an associated promise that resolves once it's ready
function initWorker(loamPrefix, gdalPrefix) {
    const defaultPrefix = getPathPrefix();

    // URL's relative path handling does the "right" thing for all relative paths. That is, if a
    // user passes in an absolute URL with a domain name, it will use the specified domain, but if a
    // path is passed in, it will just override the path and use the prefix domain.
    // https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
    loamPrefix = loamPrefix !== undefined ? new URL(loamPrefix, defaultPrefix).href : defaultPrefix;
    gdalPrefix = gdalPrefix !== undefined ? new URL(gdalPrefix, defaultPrefix).href : loamPrefix;

    if (workerPromise === undefined) {
        workerPromise = new Promise(function (resolve, reject) {
            let _worker = new LoamWorker(loamPrefix, gdalPrefix);

            // The worker needs to do some initialization, and will send a message when it's ready.
            // The message will specify msg.data.ready == true, but that's not really important;
            // during initialization the worker doesn't do any error handling so any errors will
            // bubble up to onerror (and an error before the "ready" message arrives implies that
            // the ready message will never arrive, so we need to destroy the whole worker).
            _worker.onmessage = function (msg) {
                // Once the worker's ready, change the onMessage and onError functions to handle
                // normal operations.
                _worker.onmessage = function (msg) {
                    // Execute stored promise resolver by message ID
                    // Promise resolvers are stored by callWorker().
                    if (msg.data.success) {
                        messages[msg.data.id][0](msg.data.result);
                    } else {
                        messages[msg.data.id][1](new Error(msg.data.message));
                    }
                    delete messages[msg.data.id];
                };
                // Once the worker is successfully initialized, it handles GDAL errors internally,
                // so we no longer want to do anything special for error handling.
                _worker.onerror = null;
                resolve(_worker);
            };
            // Error handler during initialization. This will get overridden upon successful worker
            // initialization. We assume that an error during initialization is fatal, so tear down
            // the worker if that happens.
            _worker.onerror = function (err) {
                err.preventDefault();
                console.error(err);
                _worker.terminate();
                reject(err);
            };
        });
    }
    return workerPromise;
}

// Store a listener function with a key so that we can associate it with a message later.
function addMessageResolver(callback, errback) {
    let key = randomKey();

    while (messages.hasOwnProperty(key)) {
        key = randomKey();
    }
    messages[key] = [callback, errback];
    return key;
}

// Send a message to the worker and return a promise that resolves / rejects when a message with
// a matching id is returned.
function workerTaskPromise(options) {
    return initWorker().then((worker) => {
        return new Promise((resolve, reject) => {
            let resolverId = addMessageResolver(
                (workerResult) => resolve(workerResult),
                (reason) => reject(reason)
            );

            worker.postMessage({ id: resolverId, ...options });
        });
    });
}

// Accessors is a list of accessors operations to run on the dataset defined by dataset.
function accessFromDataset(accessor, dataset, ...otherArgs) {
    return workerTaskPromise({ accessor: accessor, dataset: dataset, args: otherArgs });
}

// Run a single function on the worker.
function runOnWorker(func, args) {
    return workerTaskPromise({ func, args });
}

export { initWorker, clearWorker, accessFromDataset, runOnWorker };
