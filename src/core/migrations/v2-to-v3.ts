/**
 * Migration V2 → V3 — Lancio in produzione ("Season 1").
 *
 * A differenza di V1→V2 (che ricostruisce uno stato azzerato), questa migrazione
 * è ADDITIVA: marca lo status Fondatore, apre la Season 1 e prepara la scelta
 * delle skin. Il RESET vero e proprio dell'economia è delegato all'orchestratore
 * in boot.ts (`resetGameToDefault()` + reiniezione dei campi identità), esattamente
 * come già avviene per V1→V2. Tenere qui l'azzeramento romperebbe la catena
 * v1→v2→v3 (i test v1→v2 verificano qBit/formattazione preservati dallo step V2).
 *
 * Regole del cutover:
 * - Idoneità Fondatore = save PRE-lancio (schemaVersion < 3, quindi esistente prima
 *   del deploy V3 del 03/08/2026) CON progresso reale: almeno 1 Promozione oppure
 *   almeno 1 skin non-default sbloccata. Un nuovo giocatore nasce già schemaVersion 3
 *   → non passa mai da qui → non è Fondatore.
 * - Il Fondatore riceve la skin esclusiva `founder` (aggiunta dal boot) e TIENE TUTTO
 *   il guardaroba pre-lancio.
 *
 *   ⚠️ Fino alla 3.1.3 ne salvava solo 5, scelte con un picker. Tolto (25/08/2026):
 *   le skin sono **puramente estetiche** — nessuna porta effetti, moltiplicatori o
 *   bonus (`src/data/skins.ts`: solo img/rarity/themeConfig, e `themeConfig` guida
 *   musica, CSS e icone) — quindi il tetto non difendeva nessun equilibrio: toglieva
 *   e basta. Il reset di Season 1 resta dov'è che conta davvero, cioè economia,
 *   classifica e obiettivi. In più il picker era DISTRUTTIVO: alla conferma faceva
 *   `delete founderCandidateSkins`, e la lista originale non era più recuperabile.
 * - La classifica riparte pulita (Season 1): il reset dei lifetime è fatto dal boot,
 *   ma richiede il wipe/season-flip coordinato sul backend production (Edge Functions,
 *   fuori da questo repo), altrimenti l'anti-rollback server rigetta il push.
 */
import type { SaveStateV2, SaveStateV3 } from '../../types/save';
import type { MigrationStep } from './index';

/**
 * Cutover di lancio: 03/08/2026 ore 09:00 ora italiana (CEST = UTC+2) → 07:00 UTC.
 * Il discrimine "pre-lancio" è di fatto lo schemaVersion < 3: la build V3 va live
 * al lancio, quindi chiunque abbia un save di schema precedente l'ha creato prima.
 * Questa costante resta l'ancora documentale/di stagione e il timbro `foundedAt`.
 */
export const LAUNCH_TIMESTAMP = Date.UTC(2026, 7, 3, 7, 0, 0);

/**
 * Numero massimo di skin non-default che un Fondatore salva.
 * `Infinity` = nessun tetto (vedi il perché in testa al file). Resta una costante
 * e non un letterale sparso: se una Season futura vorrà rimetterlo, si cambia qui.
 */
export const MAX_FOUNDER_KEPT_SKINS = Infinity;

/** Progresso "non banale": almeno una Promozione o almeno una skin non-default. */
function isFounderEligible(state: SaveStateV2): boolean {
  const resets = Number((state as { totalResets?: unknown }).totalResets) || 0;
  if (resets >= 1) return true;
  const unlocked = state.skins?.unlocked ?? [];
  return unlocked.some((s) => !!s && s !== 'default');
}

export const v2ToV3: MigrationStep<SaveStateV2, SaveStateV3> = {
  from: 2,
  to: 3,
  description: 'V2→V3: lancio produzione, Season 1, premio Fondatore',
  apply(state) {
    const founder = isFounderEligible(state);
    const salvageable = (state.skins?.unlocked ?? ['default']).filter(
      (s) => !!s && s !== 'default',
    );
    const needsPicker = founder && salvageable.length > MAX_FOUNDER_KEPT_SKINS;

    const next: SaveStateV3 = {
      ...state,
      schemaVersion: 3,
      season: 1,
      isFounder: founder,
      pendingFounderChoice: needsPicker,
    };
    // exactOptionalPropertyTypes: campi opzionali aggiunti solo se valorizzati.
    if (founder) next.foundedAt = LAUNCH_TIMESTAMP;
    if (needsPicker) next.founderCandidateSkins = salvageable.slice();

    return { state: next, founderReward: founder, salvageableSkins: salvageable };
  },
};
