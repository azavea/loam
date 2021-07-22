import randomKey from './randomKey.js';

let messages = {};

let workerPromise;

// Cache the currently executing script at initialization so that we can use it later to figure
// out where all the other scripts should be pulled from
let _scripts = document.getElementsByTagName('script');
const THIS_SCRIPT = _scripts[_scripts.length - 1];

// Inspired by Emscripten's method for doing the same thing
function getPathPrefix() {
    return THIS_SCRIPT.src.substring(0, THIS_SCRIPT.src.lastIndexOf('/')) + '/';
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
function initWorker(pathPrefix) {
    pathPrefix = pathPrefix || getPathPrefix();

    if (workerPromise === undefined) {
        workerPromise = new Promise(function (resolve, reject) {
            let _worker = new Worker(pathPrefix + 'loam-worker.js');

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
function accessFromDataset(accessor, dataset) {
    return workerTaskPromise({ accessor: accessor, dataset: dataset });
}

// Run a single function on the worker.
function runOnWorker(func, args) {
    return workerTaskPromise({ func, args });
}

export { initWorker, clearWorker, accessFromDataset, runOnWorker };
