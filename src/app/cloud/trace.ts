/**
 * Canale "sempre acceso" per la traccia di sincronizzazione cloud.
 *
 * Il gioco zittisce console.log/warn senza DEBUG_MODE (lib/version.ts), quindi un
 * push respinto dal cloud non lasciava una riga: la segnalazione "in console non
 * dice mai niente" del 10/09/2026. Da qui passa solo ciò che serve a capire un
 * salvataggio NON andato (respinto, token, rete) e un riallineamento dal cloud —
 * non il rumore di ogni push riuscito.
 *
 * Estratto da app/boot.ts (3.2, prima estrazione del cloud-sync).
 */
export function cloudTrace(msg: string): void {
    const w = window as any;
    const orig = (w._console && typeof w._console.warn === 'function') ? w._console.warn : null;
    if (orig) orig(msg); else console.error(msg);
}
