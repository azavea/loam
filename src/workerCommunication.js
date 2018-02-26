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
function initWorker() {
    if (typeof workerPromise === 'undefined') {
        workerPromise = new Promise(function (resolve, reject) {
            let _worker = new Worker(getPathPrefix() + 'loam-worker.js');

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
                            messages[msg.data.id][1](msg.data.message);
                        }
                        delete messages[msg.data.id];
                    };
                    resolve(_worker);
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

// Call the GDAL API function specified by `name`, with an array of arguments
function callWorker(name, args) {
    return initWorker().then((worker) => {
        return new Promise(function (resolve, reject) {
            let resolverId = addMessageResolver(
                function (gdalResult) {
                    resolve(gdalResult);
                },
                function (error) {
                    reject(error);
                }
            );

            worker.postMessage({
                id: resolverId,
                function: name,
                arguments: args
            });
        });
    });
}

export { initWorker, callWorker };
