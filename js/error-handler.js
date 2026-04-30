// ============================================================
// ESPO CLICKER - Global Error Handler
// Cattura errori uncaught + promise rejection. Mostra toast
// invece di silent failure. Evita loop infinito con flag.
// ============================================================

(function () {
    'use strict';

    var _shown = 0;
    var MAX_TOASTS = 3;

    function notify(msg) {
        if (_shown >= MAX_TOASTS) return;
        _shown++;
        try {
            if (window.EspooClicker && window.EspooClicker.showToast) {
                window.EspooClicker.showToast('Errore: ' + msg, 'error');
            }
        } catch (e) { /* swallow */ }
    }

    window.addEventListener('error', function (e) {
        if (!e.message || e.message === 'Script error.') return;
        console.error('[GlobalError]', e.message, e.filename, e.lineno);
        notify(e.message);
    });

    window.addEventListener('unhandledrejection', function (e) {
        var reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
        console.error('[UnhandledRejection]', reason);
        notify(reason);
    });
})();
