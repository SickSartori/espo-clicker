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
import { teams } from './teams';
import { skins } from './skins';
import { clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades } from './upgrades';
import { achievements } from './achievements';
import { ASSET_PACKAGES } from './asset-packages';
import { en } from './en/index';
import { isChristmasSeason, isSeasonActive, IS_XMAS_TIME } from './season';
import { store } from '../state/store';

export const gameData: Record<string, any> = {
  texts,
  events,
  assets,
  teams,
  skins,
  clickUpgrades,
  prestigeUpgrades,
  buildingEnhancements,
  superUpgrades,
  achievements,
  i18n: { en },
};

export function installGameData(): void {
  if (typeof window === 'undefined') return;
  // Stagionalità pubblicata per i consumatori legacy runtime (ui-functions).
  // core.js legacy (finché esiste) la ri-assegna con valori identici: innocuo.
  (window as any).isChristmasSeason = isChristmasSeason;
  (window as any).isSeasonActive = isSeasonActive;
  (window as any).IS_XMAS_TIME = IS_XMAS_TIME;
  // store.gameData è la fonte diretta per i moduli V3. window.gameData resta
  // una proprietà bare (stessa referenza) solo per la cheatboard dev-only.
  store.gameData = gameData;
  (window as any).gameData = gameData;
  (window as any).ASSET_PACKAGES = ASSET_PACKAGES;
}
