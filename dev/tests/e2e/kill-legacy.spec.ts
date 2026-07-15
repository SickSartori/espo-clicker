import { test, expect } from '@playwright/test';
import { bootGame, trackConsoleErrors } from './helpers';

test.describe('kill-legacy — guardie migrazione', () => {
  test('PREP: i lessicali-only condivisi sono su window dopo il boot', async ({ page }) => {
    await bootGame(page);
    const present = await page.evaluate(() => {
      const w = window as any;
      return {
        AudioManager: typeof w.AudioManager,
        FX: typeof w.FX,
        EventHandlers: typeof w.EventHandlers,
        goldenBug: !!w.goldenBug,
        feedbackContainer: !!w.feedbackContainer,
        toastContainer: !!w.toastContainer,
        statsList: !!w.statsList,
      };
    });
    expect(present.AudioManager).toBe('object');
    expect(present.FX).toBe('object');
    expect(present.EventHandlers).toBe('object');
    expect(present.goldenBug).toBe(true);
    expect(present.feedbackContainer).toBe(true);
    expect(present.toastContainer).toBe(true);
    expect(present.statsList).toBe(true);
  });

  test('modals: la modale impostazioni si apre senza errori console', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await bootGame(page);

    const modal = page.locator('#settings-modal');
    await expect(modal).toBeHidden();

    await page.locator('#open-settings-btn').click();
    await expect(modal).toBeVisible();
    await expect(page.locator('#save-settings-btn')).toBeVisible();

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});

test.describe('kill-legacy — ui-functions', () => {
  const RENDER_GLOBALS = [
    'formatNumber', 'showToast', 'updateUI', 'updateSkinsUI', 'applySkinVisuals',
    'updatePrestigeVisuals', 'updatePrestigeUI', 'updateStatsUI', 'updateAchievementsUI',
    'refreshAllStores', 'updateClickStore', 'renderPrestigeHubCards', 'showClickFeedback',
    'bumpScoreDisplay', 'startMatrixEffect', 'stopMatrixEffect', 'showV2MigrationModal',
    'simpleMarkdown', 'checkTabNotifications', 'equipSkin',
  ];

  test('le funzioni-globali di rendering sono su window dopo il boot', async ({ page }) => {
    await bootGame(page);
    const missing = await page.evaluate((names) => {
      const w = window as any;
      return names.filter((n) => typeof w[n] !== 'function');
    }, RENDER_GLOBALS);
    expect(missing, `mancanti su window: ${missing.join(', ')}`).toEqual([]);
  });

  test('la modale skin si apre e si popola senza errori console', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await bootGame(page);
    const modal = page.locator('#skins-modal');
    await expect(modal).toBeHidden();
    await page.locator('#open-skins-btn').click();
    await expect(modal).toBeVisible();
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});

test.describe('kill-legacy — game-logic', () => {
  const LOGIC_GLOBALS = [
    'playSound', 'updateAmbientVolume', 'setMusicDuck', 'getCustomVolume',
    'executePrestige', 'openPrestigeHub', 'executeFormattingSequence', 'scheduleGoldenBug',
    'checkAchievements', 'calculatePrestigeBonus', 'resumeCrunchTimeEffects', 'clickGoldenBug',
    'recalculateCPS', 'reapplyAllEffects', 'activateCrunchTime', 'resolveBug',
    'calculateClickValue', 'calculateRawClickValue', 'spawnFireParticle', 'triggerBluescreen',
    'claimAchievementReward', 'buySuperUpgrade', 'buySkin', 'calculateBulkCost',
    'calculateMaxAffordable', 'buyTeam', 'calculatePrestigeUpgradeCost', 'buyPrestigeUpgrade',
    'buyTeamEnhancement', 'buyClickUpgrade', 'getPrestigeThreshold', 'applyBonusSoftcap',
    'calculatePrestigeGained',
  ];

  test('le funzioni-globali di game-logic sono su window dopo il boot', async ({ page }) => {
    await bootGame(page);
    const missing = await page.evaluate((names) => {
      const w = window as any;
      return names.filter((n) => typeof w[n] !== 'function');
    }, LOGIC_GLOBALS);
    expect(missing, `mancanti su window: ${missing.join(', ')}`).toEqual([]);
  });
});

test.describe('kill-legacy — periferici', () => {
  test('i globali dei periferici sono su window dopo il boot', async ({ page }) => {
    await bootGame(page);
    const r = await page.evaluate(() => {
      const w = window as any;
      return {
        getInitialGameState: typeof w.getInitialGameState,
        resetGameToDefault: typeof w.resetGameToDefault,
        EspoIntro: typeof w.EspoIntro?.play,
        EsposionFX: typeof w.EsposionFX?.start,
        ArcadeLoader: typeof w.ArcadeLoader?.load,
        EspoSocial: typeof w.EspoSocial?.reload,
        loadLeaderboard: typeof w.EspooClicker?.loadLeaderboard,
        gameStateReady: !!w.EspoV3.state.store.gameState && !!w.EspoV3.state.store.gameState.teams,
      };
    });
    expect(r.getInitialGameState).toBe('function');
    expect(r.resetGameToDefault).toBe('function');
    expect(r.EspoIntro).toBe('function');
    expect(r.EsposionFX).toBe('function');
    expect(r.ArcadeLoader).toBe('function');
    expect(r.EspoSocial).toBe('function');
    expect(r.loadLeaderboard).toBe('function');
    expect(r.gameStateReady).toBe(true);
  });
});
