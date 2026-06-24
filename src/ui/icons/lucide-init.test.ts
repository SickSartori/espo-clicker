import { describe, it, expect, beforeEach } from 'vitest';
import { renderLucideIcons } from './lucide-init';

/**
 * Regression test per il bug "Impossibile cliccare i pulsanti se il puntatore
 * e' sopra l'icona".
 *
 * Causa radice: lucide copia `data-lucide` anche sull'<svg> generato. Senza
 * marcarlo come gia' processato, ogni render successivo ri-matcha quell'svg e lo
 * SOSTITUISCE con un nodo nuovo. Il MutationObserver (childList+subtree su body)
 * vede il nuovo nodo, ri-schedula un render, e parte un loop ~a ogni frame: il
 * nodo icona viene staccato di continuo, cosi' mousedown e mouseup non cadono
 * mai sullo stesso nodo e il `click` non viene emesso. Il padding del <button>
 * (nodo stabile) resta cliccabile -> sintomo "solo sopra l'icona".
 *
 * renderLucideIcons() DEVE essere idempotente.
 */
describe('renderLucideIcons — idempotenza (niente render loop)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('converte <i data-lucide> in <svg>', () => {
    document.body.innerHTML =
      '<button id="b"><i class="nav-icon" data-lucide="award"></i></button>';
    renderLucideIcons();
    expect(document.querySelector('#b svg')).not.toBeNull();
  });

  it('non lascia icone ri-processabili (nessun svg[data-lucide] dopo il render)', () => {
    document.body.innerHTML =
      '<button id="b"><i class="nav-icon" data-lucide="award"></i></button>';
    renderLucideIcons();
    expect(document.querySelectorAll('svg[data-lucide]').length).toBe(0);
  });

  it('idempotente: un secondo render NON sostituisce il nodo gia’ reso', () => {
    document.body.innerHTML =
      '<button id="b"><i class="nav-icon" data-lucide="award"></i></button>';
    renderLucideIcons();
    const first = document.querySelector('#b svg');
    renderLucideIcons();
    const second = document.querySelector('#b svg');
    // stesso identico nodo => nessuna churn => il click sopra l'icona resta integro
    expect(second).toBe(first);
  });
});
