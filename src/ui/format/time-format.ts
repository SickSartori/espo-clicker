/**
 * Time formatting — gemello V3 di formatTime (js/ui-functions.js, F5 fetta 3).
 * Puro: le etichette (d/h/m/s, localizzate) arrivano da gameData via wrapper.
 * Semantica legacy replicata: unità mostrate a cascata (se ci sono giorni si
 * mostrano anche ore/minuti pur se zero), secondi sempre presenti.
 */

export interface TimeLabels {
  d: string;
  h: string;
  m: string;
  s: string;
}

export function formatTime(totalSeconds: number, labels: TimeLabels): string {
  let t = Math.floor(totalSeconds);
  const days = Math.floor(t / (3600 * 24));
  t %= 3600 * 24;
  const hours = Math.floor(t / 3600);
  t %= 3600;
  const minutes = Math.floor(t / 60);
  const seconds = t % 60;

  let out = '';
  if (days > 0) out += `${days}${labels.d} `;
  if (hours > 0 || days > 0) out += `${hours}${labels.h} `;
  if (minutes > 0 || hours > 0 || days > 0) out += `${minutes}${labels.m} `;
  out += `${seconds}${labels.s}`;
  return out;
}
