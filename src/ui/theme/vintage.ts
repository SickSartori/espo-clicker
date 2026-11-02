/**
 * Tema Vintage v1 (3.3) — la veste della prima versione, come interruttore.
 *
 * Non è legato a una skin: sta nelle Opzioni (`user.vintageTheme`) e si sblocca
 * riscattando l'obiettivo del primo compleanno. Vale per tutte le skin senza un
 * tema proprio; se la skin indossata ne ha uno (Halloween, Natale, 8bit, Super)
 * vince lei. Con lo switch acceso la mascotte base (Espòòò) mostra l'arte della
 * v1, quella col fondo blu.
 *
 * PURO: stato di gioco e skin arrivano da fuori. Il resto (CSS, immagini, UI)
 * lo fa render/index.ts e ui/modals.
 */

/** Stesso formato di `themeConfig` delle skin: lo legge applySkinVisuals. */
export const VINTAGE_THEME = {
    cssFile: 'vintage-theme.css',
    bodyClass: 'theme-vintage',
} as const;

/** Arte della mascotte base con il tema acceso (sotto assets/image/). */
export const VINTAGE_ART = {
    img: 'skins/espo-v1.webp',
    imgClick: 'skins/espo-v1-click.webp',
} as const;

/** L'obiettivo che sblocca lo switch: riscattato = tema disponibile. */
export const VINTAGE_UNLOCK_ACHIEVEMENT = 'primoCompleanno';

/** La skin base: l'unica che cambia volto col tema. */
export const BASE_SKIN_ID = 'default';

export interface VintageState {
    /** Premio riscattato: lo switch è utilizzabile. */
    unlocked: boolean;
    /** Switch acceso nelle Opzioni. */
    on: boolean;
    /** La skin indossata ha già un tema suo: vince lei. */
    blockedBySkin: boolean;
    /** Il tema si applica davvero ora. */
    active: boolean;
}

/** PURA. La skin porta un tema proprio (classe sul body o foglio CSS)? */
export function skinHasOwnTheme(skinData: any): boolean {
    const t = skinData && skinData.themeConfig;
    return !!(t && (t.bodyClass || t.cssFile));
}

/**
 * PURA. Stato del tema Vintage. «Sbloccato» si legge dal premio riscattato e non
 * dal flag dello switch: chi si scrive `user.vintageTheme = true` dalla console
 * senza aver riscattato non ottiene niente.
 */
export function vintageState(gs: any, skinData: any): VintageState {
    const a = gs && gs.achievements && gs.achievements[VINTAGE_UNLOCK_ACHIEVEMENT];
    const unlocked = !!(a && a.claimed);
    const on = !!(gs && gs.user && gs.user.vintageTheme);
    const blockedBySkin = skinHasOwnTheme(skinData);
    return { unlocked, on, blockedBySkin, active: unlocked && on && !blockedBySkin };
}

/**
 * PURA. Immagini della mascotte per `skinId`: l'arte v1 solo per la skin base
 * col tema attivo, altrimenti quella della skin stessa.
 */
export function mascotArt(
    skinId: string, skinData: { img?: string; imgClick?: string } | undefined, vintageActive: boolean,
): { img: string | undefined; imgClick: string | undefined } {
    if (vintageActive && skinId === BASE_SKIN_ID) return { img: VINTAGE_ART.img, imgClick: VINTAGE_ART.imgClick };
    return { img: skinData && skinData.img, imgClick: skinData && skinData.imgClick };
}
