import { texts } from './texts';
import { teams } from './teams';
import { clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades } from './upgrades';
import { skins } from './skins';
import { achievements } from './achievements';
import { events } from './events';

/** Dizionario overlay EN — stesse chiavi che il legacy scriveva su gameData.i18n.en */
export const en: Record<string, any> = {
  texts, teams, clickUpgrades, prestigeUpgrades, buildingEnhancements, superUpgrades, skins, achievements, events,
};
