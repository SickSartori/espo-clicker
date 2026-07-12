/**
 * Assemblaggio dati di gioco (reorg filone B). Il modulo V3 esegue PRIMA del
 * bundle legacy (contratto F0): installGameData() pubblica l'oggetto su
 * window.gameData / window.ASSET_PACKAGES, così i18n.js, gamestate.js e tutto
 * il legacy trovano i dati già pronti. I file dati legacy non ancora
 * convertiti sovrascrivono la PROPRIA fetta con contenuto identico (core.js
 * legacy preserva l'oggetto: window.gameData = window.gameData || {}).
 */
import { texts } from './texts';
import { events } from './events';
import { assets } from './assets';
import { ASSET_PACKAGES } from './asset-packages';

export const gameData: Record<string, any> = {
  texts,
  events,
  assets,
};

export function installGameData(): void {
  if (typeof window === 'undefined') return;
  (window as any).gameData = gameData;
  (window as any).ASSET_PACKAGES = ASSET_PACKAGES;
}
