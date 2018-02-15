let messages = {};

let workerPromise;

// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
function randomKey() {
    const length = 32;
    const chars = (
        '0123456789' +
        'abcdefghijklmnopqrstuvwxzy'
    );
    let result = '';

    for (let i = length; i > 0; i--) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// Set up a WebWorker and an associated promise that resolves once it's ready
function initWorker() {
    if (typeof workerPromise === 'undefined') {
        workerPromise = new Promise(function (resolve, reject) {
            // TODO: Probably pass in this path from outside
            let _worker = new Worker('loam-worker.js');

            // The worker needs to do some initialization, and will send a message when it's ready.
            _worker.onmessage = function (msg) {
                if (msg.data.ready) {
                    // Once the worker's ready, change the onMessage function to execute and clear
                    // the stored promise resolvers.
                    _worker.onmessage = function (msg) {
                        // Execute stored promise resolver by message ID
                        // Promise resolvers are stored by callGDAL.
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
    initWorker();
    return new Promise(function (resolve, reject) {
        workerPromise.then((worker) => {
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

export default callWorker;
