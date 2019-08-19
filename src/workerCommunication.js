import randomKey from './randomKey.js';

let messages = {};

let workerPromise;

// Cache the currently executing script at initialization so that we can use it later to figure
// out where all the other scripts should be pulled from
let _scripts = document.getElementsByTagName('script');
const THIS_SCRIPT = _scripts[_scripts.length - 1];

// Inspired by Emscripten's method for doing the same thing
function getPathPrefix() {
    return THIS_SCRIPT.src.substring(
        0,
        THIS_SCRIPT.src.lastIndexOf('/')
    ) + '/';
}

// Set up a WebWorker and an associated promise that resolves once it's ready
function initWorker(pathPrefix) {
    pathPrefix = pathPrefix || getPathPrefix();

    if (typeof workerPromise === 'undefined') {
        workerPromise = new Promise(function (resolve, reject) {
            let _worker = new Worker(pathPrefix + 'loam-worker.js');

            // The worker needs to do some initialization, and will send a message when it's ready.
            _worker.onmessage = function (msg) {
                if (msg.data.ready) {
                    // Once the worker's ready, change the onMessage function to execute and clear
                    // the stored promise resolvers.
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
                    resolve(_worker);
                } else if (msg.data.error) {
                    reject(msg.data.error);
                }
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
                workerResult => resolve(workerResult),
                reason => reject(reason)
            );

            worker.postMessage({id: resolverId, ...options});
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

export { initWorker, accessFromDataset, runOnWorker };
