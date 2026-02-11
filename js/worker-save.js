// js/worker-save.js
importScripts('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js');

self.onmessage = function(e) {
    const gameState = e.data;
    try {
        const json = JSON.stringify(gameState);
        const compressed = LZString.compressToUTF16(json);
        self.postMessage({ status: 'success', data: compressed });
    } catch (err) {
        self.postMessage({ status: 'error', error: err.message });
    }
};