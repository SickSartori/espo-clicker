/**
 * Popup "come si segnala" — quando riproporlo. PURO: niente window/DOM.
 *
 * Non è una tantum: torna almeno una volta a settimana. Il popup serve a
 * ricordare che la scheda Segnala esiste, e un promemoria visto una volta sola,
 * mesi fa, non ricorda niente. Il ritmo è la costante qui sotto.
 *
 * Nel save vive `feedbackIntroAt`, il timestamp dell'ULTIMA apertura (0 = mai).
 * Ha preso il posto del booleano `seenFeedbackIntro`, che sapeva dire solo
 * "visto" e non quando: i save che hanno ancora solo quello risultano "mai
 * mostrato", lo rivedono una volta al primo accesso e poi seguono il ritmo.
 * Viaggia col cloud, quindi il conto non riparte cambiando dispositivo.
 */

/** Ritmo: al più una volta ogni 7 giorni, contati dall'ultima apertura. */
export const FEEDBACK_INTRO_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

export interface FeedbackIntroState {
  feedbackIntroAt?: unknown;
}

/**
 * È ora di riproporlo? `now` è iniettato per i test.
 * Un timestamp nel FUTURO (orologio riportato indietro) conta come dovuto:
 * altrimenti il popup tacerebbe finché l'orologio non lo raggiunge.
 */
export function feedbackIntroDue(state: FeedbackIntroState | null | undefined, now: number): boolean {
  if (!state) return false;
  const raw = state.feedbackIntroAt;
  const at = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  if (at <= 0) return true;
  if (at > now) return true;
  return now - at >= FEEDBACK_INTRO_EVERY_MS;
}
