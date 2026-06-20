/*
 * balance-sim.js — Simulatore economia Espo Clicker (analisi bilanciamento).
 * Carica i dati REALI del gioco (teams.js, upgrades.js) con uno shim Decimal,
 * e misura il tempo reale (gioco aperto) per salire di livello (= 1 Promozione).
 *
 * Modello giocatore ("idle focalizzato sul livellare"):
 *  - Acquisto greedy per efficienza: compra l'unità/potenziamento con minor
 *    costo / BPS-marginale (auto-bilancia tra i tier come in un idle classico).
 *  - Compra i potenziamenti edificio (enhancement) appena sbloccati+convenienti.
 *  - Click leggero a 4/s solo per il bootstrap (si auto-annulla a scala alta).
 *  - Promozione appena raggiunta la soglia (overshoot minimo = livellare il più
 *    veloce possibile = scenario peggiore per la "durabilità").
 *  - Token spesi: strutturali economici una tantum, poi tutto in Sinergia.
 *  - NIENTE eventi/golden bug/offline (vengono discussi a parte: acceleratori).
 *
 * Eseguire:  node balance-sim.js
 */

// ---- Shim minimale per caricare i file dati del gioco ----
global.window = { gameData: {} };
function Decimal(v) { this.n = Number(v); }
global.Decimal = Decimal;
require('../js/data/teams.js');
require('../js/data/upgrades.js');

const D = (x) => (x && typeof x === 'object' && 'n' in x) ? x.n : Number(x);
const TEAMS = global.window.gameData.teams;
const ENH = global.window.gameData.buildingEnhancements;
const CLICKUP = global.window.gameData.clickUpgrades;

const teamKeys = Object.keys(TEAMS);
// Enhancement raggruppati per team target
const enhByTeam = {};
for (const k of teamKeys) enhByTeam[k] = [];
for (const ek in ENH) {
    const e = ENH[ek];
    if (enhByTeam[e.targetTeam]) enhByTeam[e.targetTeam].push({
        key: ek, cost: D(e.cost), mult: D(e.multiplier), req: e.requiredCount
    });
}

// ---- Helpers economia (mirror del codice di gioco) ----
function to3(x) { // Decimal.toPrecision(3)
    if (x === 0) return 0;
    const e = Math.floor(Math.log10(Math.abs(x)));
    const f = Math.pow(10, e - 2);
    return Math.round(x / f) * f;
}
function threshold(resets, growth) { return to3(50e6 * Math.pow(growth, resets)); }
function reward(totalScore, capMult, resets, growth) {
    let ts = totalScore;
    if (capMult) ts = Math.min(ts, capMult * threshold(resets, growth));
    return Math.floor(Math.sqrt(ts / 250000));
}

// ---- Simula UNA run fino alla soglia, ritorna tempo (s) e totalScore ----
function simulateRun(prestigeBonus, shop, resets, growth, overshoot) {
    overshoot = overshoot || 1;
    const count = {}; for (const k of teamKeys) count[k] = 0;
    const enhBought = {}; for (const ek in ENH) enhBought[ek] = false;
    const clickBought = {}; for (const ck in CLICKUP) clickBought[ck] = false;
    let baseClickValue = 1, clickGlobalMult = 1;

    // Seed da prestige upgrades
    count.assistenteQa = (shop.accelerazione ? 1 : 0) + shop.eredita;
    let score = 2000 * shop.paracadute;     // paracadute: bug iniziali
    let totalScore = 0;                      // il seed NON conta per la soglia

    const r = Math.max(1.05, 1.22 - 0.01 * shop.contrattazione);
    const baseDisc = Math.max(0.75, 1 - 0.05 * shop.outsourcing);
    const T = threshold(resets, growth) * overshoot;
    const CPS_CLICK = 4;

    const enhMult = (k) => {
        let m = 1;
        for (const e of enhByTeam[k]) if (enhBought[e.key]) m *= e.mult;
        return m;
    };
    const unitCost = (k) => Math.floor(D(TEAMS[k].baseCost) * baseDisc * Math.pow(r, count[k]));

    let t = 0, guard = 0;
    while (totalScore < T) {
        if (++guard > 2_000_000) { t = Infinity; break; }

        let baseCPS = 0;
        for (const k of teamKeys) if (count[k] > 0) baseCPS += D(TEAMS[k].cpsPerUnit) * enhMult(k) * count[k];
        const bps = baseCPS * prestigeBonus;
        const clickValue = baseClickValue * clickGlobalMult * prestigeBonus;
        const income = bps + clickValue * CPS_CLICK;
        if (income <= 0) { t = Infinity; break; }

        // Click upgrade economici per bootstrap (solo costo <= 1e6, flat o moltiplicatori)
        let boughtClick = false;
        for (const ck in CLICKUP) {
            const c = CLICKUP[ck];
            if (clickBought[ck] || D(c.cost) > 1e6) continue;
            if (score >= D(c.cost)) {
                score -= D(c.cost);
                clickBought[ck] = true;
                if (c.clickIncrease) baseClickValue += D(c.clickIncrease);
                if (c.effects) for (const ef of c.effects)
                    if (ef.type === 'mult_global' && ef.stat === 'clickGlobalMult') clickGlobalMult *= D(ef.val);
                boughtClick = true;
                break;
            }
        }
        if (boughtClick) continue;

        // Candidati: 1 unità per team + enhancement sbloccati
        let best = null;
        for (const k of teamKeys) {
            const gain = D(TEAMS[k].cpsPerUnit) * enhMult(k); // BPS marginale (base)
            if (gain <= 0) continue;
            const c = unitCost(k);
            const eff = c / gain;
            if (!best || eff < best.eff) best = { type: 'team', k, cost: c, eff };
        }
        for (const k of teamKeys) {
            if (count[k] <= 0) continue;
            const lineBPS = D(TEAMS[k].cpsPerUnit) * enhMult(k) * count[k];
            for (const e of enhByTeam[k]) {
                if (enhBought[e.key] || count[k] < e.req) continue;
                const gain = lineBPS * (e.mult - 1);
                if (gain <= 0) continue;
                const eff = e.cost / gain;
                if (!best || eff < best.eff) best = { type: 'enh', k, ek: e.key, cost: e.cost, eff };
            }
        }

        const timeToT = (T - totalScore) / income;
        if (!best) { t += timeToT; break; }

        const need = best.cost - score;
        const wait = need > 0 ? need / income : 0;
        if (wait >= timeToT) { t += timeToT; break; }

        t += wait;
        score += income * wait - best.cost;
        totalScore += income * wait;
        if (best.type === 'team') count[best.k] += 1;
        else enhBought[best.ek] = true;
    }
    return { time: t, totalScore: Math.max(T, totalScore) };
}

// ---- Spesa token (greedy: strutturali economici, poi Sinergia) ----
function spendTokens(pp, shop) {
    const synCost = (lvl) => {
        let c = 5 * Math.pow(1.5, lvl);
        return c >= 100 ? to3(c) : Math.floor(c);
    };
    const cnt = (base, lvl) => { let c = base * Math.pow(1.5, lvl); return c >= 100 ? to3(c) : Math.floor(c); };
    let changed = true;
    while (changed) {
        changed = true;
        // priorità strutturali (costi bassi, grande QoL/bootstrap)
        if (!shop.accelerazione && pp >= 15) { pp -= 15; shop.accelerazione = true; continue; }
        if (shop.contrattazione < 10 && pp >= cnt(500, shop.contrattazione)) { pp -= cnt(500, shop.contrattazione); shop.contrattazione++; continue; }
        if (shop.outsourcing < 5 && pp >= cnt(300, shop.outsourcing)) { pp -= cnt(300, shop.outsourcing); shop.outsourcing++; continue; }
        if (shop.paracadute < 10 && pp >= cnt(25, shop.paracadute)) { pp -= cnt(25, shop.paracadute); shop.paracadute++; continue; }
        if (shop.eredita < 5 && pp >= cnt(100, shop.eredita)) { pp -= cnt(100, shop.eredita); shop.eredita++; continue; }
        // resto in Sinergia (lo scaler dominante)
        if (pp >= synCost(shop.sinergia)) { pp -= synCost(shop.sinergia); shop.sinergia++; continue; }
        changed = false;
    }
    return pp;
}

// ---- Formule bonus permanente (la leva chiave) ----
function bonusOf(mode, lifetime, syn) {
    const synFactor = 0.001 * syn;
    switch (mode) {
        case 'current': return 1 + lifetime * 0.01 + synFactor * lifetime;       // attuale
        case 'nosyn':   return 1 + lifetime * 0.01;                              // senza sinergia
        case 'sqrt':    return 1 + 0.04 * Math.sqrt(lifetime) * (1 + synFactor); // rendimenti decrescenti
        // 'wrap*': avvolge il bonus ATTUALE (base+sinergia) in un softcap.
        // Identico a oggi fino a K2 (early intatto), poi √. Minima modifica al codice.
        case 'wrap06': { const X = lifetime*(0.01+synFactor); const K2=80,C2=0.6; return 1+(X<=K2?X:K2+C2*Math.sqrt(X-K2)); }
        case 'wrap10': { const X = lifetime*(0.01+synFactor); const K2=80,C2=1.0; return 1+(X<=K2?X:K2+C2*Math.sqrt(X-K2)); }
        case 'wrap15': { const X = lifetime*(0.01+synFactor); const K2=80,C2=1.5; return 1+(X<=K2?X:K2+C2*Math.sqrt(X-K2)); }
        case 'softcap': { // lineare fino a K (early veloce), poi √ (late lento)
            const K = 3000;
            const lin = 0.01 * Math.min(lifetime, K);
            const tail = lifetime > K ? 0.4 * Math.sqrt(lifetime - K) : 0;
            return 1 + (lin + tail) * (1 + synFactor);
        }
        default: return 1 + lifetime * 0.01 + synFactor * lifetime;
    }
}

// ---- Loop multi-livello ----
function run(opts) {
    const growth = opts.growth, capMult = opts.capMult || null, maxLevel = opts.maxLevel || 20;
    const mode = opts.bonusMode || 'current', overshoot = opts.overshoot || 1;
    let lifetime = 0, pp = 0, cum = 0;
    const shop = { sinergia: 0, paracadute: 0, contrattazione: 0, outsourcing: 0, eredita: 0, accelerazione: false };
    const achGiven = {};
    const rows = [];
    for (let resets = 0; resets < maxLevel; resets++) {
        const prestigeBonus = bonusOf(mode, lifetime, shop.sinergia);
        const res = simulateRun(prestigeBonus, shop, resets, growth, overshoot);
        cum += res.time;
        const gained = reward(res.totalScore, capMult, resets, growth);
        rows.push({
            level: resets + 1, runTime: res.time, cum,
            bonus: prestigeBonus, gained, lifetime: lifetime + gained, syn: shop.sinergia
        });
        lifetime += gained; pp += gained;
        // achievement token one-shot (condizioni su totalScore della run)
        if (!achGiven.mil && res.totalScore >= 10e6) { pp += 5; achGiven.mil = true; }
        if (!achGiven.bil && res.totalScore >= 1e9) { pp += 10; achGiven.bil = true; }
        pp = spendTokens(pp, shop);
    }
    return rows;
}

// ---- Output ----
function fmtTime(s) {
    if (!isFinite(s)) return '∞';
    if (s < 90) return s.toFixed(0) + 's';
    if (s < 5400) return (s / 60).toFixed(1) + 'm';
    if (s < 172800) return (s / 3600).toFixed(1) + 'h';
    return (s / 86400).toFixed(1) + 'g';
}
function table(title, rows) {
    console.log('\n=== ' + title + ' ===');
    console.log('Liv | t.run    | t.cumul   | bonus×    | token | syn');
    for (const r of rows) {
        console.log(
            String(r.level).padStart(3) + ' | ' +
            fmtTime(r.runTime).padStart(8) + ' | ' +
            fmtTime(r.cum).padStart(9) + ' | ' +
            ('x' + r.bonus.toFixed(r.bonus < 100 ? 2 : 0)).padStart(8) + ' | ' +
            String(r.gained).padStart(5) + ' | ' +
            String(r.syn).padStart(3)
        );
    }
}

console.log('Teams:', teamKeys.length, '| Enhancement:', Object.keys(ENH).length);
console.log('Modello: idle, promozione a soglia (overshoot 1x), no eventi/golden/offline.\n');

console.log('############ A) LEVA "GROWTH FACTOR" (gioco minimo) ############');
table('A1 · ATTUALE growth 3.0', run({ growth: 3.0 }));
table('A2 · growth 3.5', run({ growth: 3.5 }));
table('A3 · growth 5.0', run({ growth: 5.0 }));

console.log('\n############ B) LEVA "BONUS PERMANENTE" (growth 3.0 fisso) ############');
table('B1 · ATTUALE (lineare + sinergia)', run({ growth: 3.0, bonusMode: 'current' }));
table('B2 · senza sinergia (solo 1%/token)', run({ growth: 3.0, bonusMode: 'nosyn' }));
table('B3 · rendimenti decrescenti (sqrt)', run({ growth: 3.0, bonusMode: 'sqrt' }));
table('B4 · SOFTCAP (lineare<3000, poi sqrt)', run({ growth: 3.0, bonusMode: 'softcap' }));
table('W06 · wrap softcap C2=0.6', run({ growth: 3.0, bonusMode: 'wrap06' }));
table('W10 · wrap softcap C2=1.0', run({ growth: 3.0, bonusMode: 'wrap10' }));
table('W15 · wrap softcap C2=1.5', run({ growth: 3.0, bonusMode: 'wrap15' }));

console.log('\n############ C) LEVA "GRIND DI UNA RUN" (overshoot) ############');
table('C1 · ATTUALE, grinder 8x soglia, reward NON cappata', run({ growth: 3.0, overshoot: 8 }));
table('C2 · grinder 8x soglia, reward CAPPATA 4x', run({ growth: 3.0, overshoot: 8, capMult: 4 }));

console.log('\n############ D) COMBINATO consigliato ############');
table('D1 · sqrt + growth 3.5 + cap 4x, grinder 8x', run({ growth: 3.5, bonusMode: 'sqrt', overshoot: 8, capMult: 4 }));
