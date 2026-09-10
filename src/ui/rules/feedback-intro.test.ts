import { describe, it, expect } from 'vitest';
import { feedbackIntroDue, FEEDBACK_INTRO_EVERY_MS } from './feedback-intro';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('feedbackIntroDue', () => {
  it('mai mostrato → dovuto', () => {
    expect(feedbackIntroDue({}, NOW)).toBe(true);
    expect(feedbackIntroDue({ feedbackIntroAt: 0 }, NOW)).toBe(true);
  });

  it('save vecchio col solo booleano seenFeedbackIntro → dovuto: lo rivede una volta, poi il ritmo', () => {
    expect(feedbackIntroDue({ seenFeedbackIntro: true } as any, NOW)).toBe(true);
  });

  it('mostrato di recente → non dovuto', () => {
    expect(feedbackIntroDue({ feedbackIntroAt: NOW }, NOW)).toBe(false);
    expect(feedbackIntroDue({ feedbackIntroAt: NOW - 6 * DAY }, NOW)).toBe(false);
    expect(feedbackIntroDue({ feedbackIntroAt: NOW - FEEDBACK_INTRO_EVERY_MS + 1 }, NOW)).toBe(false);
  });

  it('a sette giorni esatti torna, e resta dovuto finché non viene riaperto', () => {
    expect(feedbackIntroDue({ feedbackIntroAt: NOW - FEEDBACK_INTRO_EVERY_MS }, NOW)).toBe(true);
    expect(feedbackIntroDue({ feedbackIntroAt: NOW - 30 * DAY }, NOW)).toBe(true);
  });

  it('timestamp nel futuro (orologio riportato indietro) → dovuto, non muto per sempre', () => {
    expect(feedbackIntroDue({ feedbackIntroAt: NOW + 365 * DAY }, NOW)).toBe(true);
  });

  it('valori non numerici → come mai mostrato', () => {
    expect(feedbackIntroDue({ feedbackIntroAt: 'ieri' }, NOW)).toBe(true);
    expect(feedbackIntroDue({ feedbackIntroAt: NaN }, NOW)).toBe(true);
  });

  it('senza stato → mai', () => {
    expect(feedbackIntroDue(null, NOW)).toBe(false);
    expect(feedbackIntroDue(undefined, NOW)).toBe(false);
  });

  it('il ritmo è una settimana', () => {
    expect(FEEDBACK_INTRO_EVERY_MS).toBe(7 * DAY);
  });
});
