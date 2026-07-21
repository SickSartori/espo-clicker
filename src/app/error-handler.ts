/**
 * Error handler globale (ex js/error-handler.js — reorg C-thin, 2026-07-12).
 * Cattura errori uncaught + promise rejection: toast invece di silent failure.
 * Registrato a tempo-modulo → copre anche gli errori del modulo V3 (prima
 * partiva col bundle: miglioramento, delta accettato).
 */
export function installErrorHandler(): void {
    if (typeof window === 'undefined') return;

    var _shown = 0;
    var MAX_TOASTS = 3;

    function notify(msg: string): void {
        if (_shown >= MAX_TOASTS) return;
        _shown++;
        try {
            const ec = (window as any).EspooClicker;
            if (ec && ec.showToast) {
                ec.showToast('Errore: ' + msg, 'error');
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
}
