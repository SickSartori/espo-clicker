import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  prestigeGained,
  applyTokenDuplicator,
  prestigeStartingBugs,
  prestigeTeamCarryover,
  formatQbitsEarned,
} from './prestige';
import type { DecimalCtor } from './economy';

const D = Decimal as unknown as DecimalCtor;

describe('prestigeGained', () => {
  const threshold = '50000000'; // 50M (0 reset)

  it('sotto soglia → 0', () => {
    expect(prestigeGained(D, { totalScore: '49999999', threshold }).toString()).toBe('0');
  });

  it('a soglia esatta: sqrt(50M/250k) = sqrt(200) → 14', () => {
    expect(prestigeGained(D, { totalScore: threshold, threshold }).toString()).toBe('14');
  });

  it('cap anti-grind a 4× soglia', () => {
    // 4×50M = 200M utile → sqrt(800) = 28.28 → 28, anche con score 100× più alto
    const capped = prestigeGained(D, { totalScore: '20000000000', threshold });
    expect(capped.toString()).toBe('28');
    expect(prestigeGained(D, { totalScore: '200000000', threshold }).toString()).toBe('28');
  });

  it('scala con la radice dello score utile', () => {
    // 100M utile → sqrt(400) = 20
    expect(prestigeGained(D, { totalScore: '100000000', threshold }).toString()).toBe('20');
  });
});

describe('applyTokenDuplicator', () => {
  it('+20% floored solo se acquistato', () => {
    expect(applyTokenDuplicator(new D(10), true).toString()).toBe('12');
    expect(applyTokenDuplicator(new D(14), true).toString()).toBe('16'); // 16.8 → 16
    expect(applyTokenDuplicator(new D(14), false).toString()).toBe('14');
  });
});

describe('prestigeStartingBugs', () => {
  it('paracadute: 2000 × livello', () => {
    expect(prestigeStartingBugs(D, { paracaduteLevel: 3, fastStart: false }).toString()).toBe('6000');
  });

  it('fast start: +1M, cumulabile', () => {
    expect(prestigeStartingBugs(D, { paracaduteLevel: 0, fastStart: true }).toString()).toBe('1000000');
    expect(prestigeStartingBugs(D, { paracaduteLevel: 2, fastStart: true }).toString()).toBe('1004000');
  });

  it('niente upgrade → 0', () => {
    expect(prestigeStartingBugs(D, { paracaduteLevel: 0, fastStart: false }).toString()).toBe('0');
  });
});

describe('prestigeTeamCarryover', () => {
  const base = {
    keepTeams: false, deadlineLevel: 0, ereditaLevel: 0,
    accelerazione: false, fastStart: false,
    previous: { assistenteQa: 50, jiraTicket: 30, teamQa: 10, svilSenior: 99 },
    initial: { assistenteQa: 0, jiraTicket: 0, teamQa: 0, svilSenior: 0 },
  };

  it('senza upgrade → tutto azzerato', () => {
    expect(prestigeTeamCarryover(base)).toEqual({ assistenteQa: 0, jiraTicket: 0, teamQa: 0, svilSenior: 0 });
  });

  it('keep teams: min(5+deadline, prev) SOLO sui 3 team base', () => {
    const out = prestigeTeamCarryover({ ...base, keepTeams: true, deadlineLevel: 2 });
    expect(out).toEqual({ assistenteQa: 7, jiraTicket: 7, teamQa: 7, svilSenior: 0 });
  });

  it('keep teams non tocca team base a 0 e rispetta prev più basso del tetto', () => {
    const out = prestigeTeamCarryover({
      ...base, keepTeams: true,
      previous: { assistenteQa: 3, jiraTicket: 0, teamQa: 100 },
      initial: { assistenteQa: 0, jiraTicket: 0, teamQa: 0 },
    });
    expect(out).toEqual({ assistenteQa: 3, jiraTicket: 0, teamQa: 5 });
  });

  it('eredità garantisce il minimo di Assistenti QA', () => {
    expect(prestigeTeamCarryover({ ...base, ereditaLevel: 8 })['assistenteQa']).toBe(8);
    // ma non abbassa un keep più alto
    const kept = prestigeTeamCarryover({ ...base, keepTeams: true, deadlineLevel: 10, ereditaLevel: 8 });
    expect(kept['assistenteQa']).toBe(15); // min(15, 50)=15 > eredità 8
  });

  it('accelerazione +1 e fast start +5 si sommano DOPO eredità', () => {
    const out = prestigeTeamCarryover({ ...base, ereditaLevel: 8, accelerazione: true, fastStart: true });
    expect(out['assistenteQa']).toBe(14); // max(0,8) + 1 + 5
  });
});

describe('formatQbitsEarned', () => {
  it('1 garantito sotto 10k token', () => {
    expect(formatQbitsEarned(D, '9999').toString()).toBe('1');
    expect(formatQbitsEarned(D, '0').toString()).toBe('1');
  });

  it('bonus sqrt(token/10000) oltre la soglia', () => {
    // 40000/10000 = 4 → sqrt 2 → 1+2 = 3
    expect(formatQbitsEarned(D, '40000').toString()).toBe('3');
    // 1M/10k = 100 → sqrt 10 → 11
    expect(formatQbitsEarned(D, '1000000').toString()).toBe('11');
  });
});
