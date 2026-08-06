// ============================================================
// ESPO CLICKER — "Segnala" (feedback → Trello)
// La segnalazione vive come TAB dentro il modale Help (#help-modal):
//   Guida | Segnala. Questo script gestisce lo switch dei tab, il
//   selettore tipo (Idea/Bug/Miglioramento) e l'invio a
//   php/trello-submit.php. Apertura/chiusura del modale e rendering
//   delle icone Lucide sono gestiti dal bundle del gioco.
//   Nessun segreto lato client: il token vive nel PHP.
// ============================================================
(function () {
    'use strict';

    function init() {
        var modal = document.getElementById('help-modal');
        var form  = document.getElementById('feedback-form');
        if (!modal || !form) return;

        function toast(msg, type) {
            if (window.EspooClicker && typeof window.EspooClicker.showToast === 'function') {
                window.EspooClicker.showToast(msg, type || 'info');
            }
        }

        // --- Switch tab (Guida | Segnala) ---
        var tabs   = modal.querySelectorAll('.help-tab');
        var panels = modal.querySelectorAll('.help-panel');
        function activateTab(name) {
            tabs.forEach(function (t) {
                var on = t.getAttribute('data-htab') === name;
                t.classList.toggle('active', on);
                t.style.color = on ? '#3498db' : '#7f8c8d';
                t.style.borderBottomColor = on ? '#3498db' : 'transparent';
            });
            panels.forEach(function (p) {
                p.style.display = (p.getAttribute('data-hpanel') === name) ? '' : 'none';
            });
            if (name === 'segnala') {
                var t = document.getElementById('fb-title');
                if (t) setTimeout(function () { t.focus(); }, 60);
            }
        }
        tabs.forEach(function (t) {
            t.addEventListener('click', function () { activateTab(t.getAttribute('data-htab')); });
        });

        // Apre l'Aiuto direttamente sulla scheda Segnala. Serve al popup
        // "come si segnala" (una tantum dopo le note di rilascio): senza,
        // il suo pulsante potrebbe solo aprire l'Aiuto sulla Guida, cioè
        // lasciare l'utente a un passo dal modulo.
        // Passa dal pulsante Aiuto vero invece di aprire il modale a mano:
        // l'apertura ha animazioni e stato suoi (openModal in ui/modals) che
        // non sono esposti qui, e riscriverli sarebbe una seconda verità.
        window.openFeedbackTab = function () {
            var btn = document.getElementById('open-help-btn');
            if (btn) btn.click();
            activateTab('segnala');
        };

        // --- Selettore tipo (Idea / Bug / Miglioramento) ---
        var typeInput = document.getElementById('fb-type');
        var typeBtns  = form.querySelectorAll('.fb-type');
        typeBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                typeBtns.forEach(function (x) {
                    x.classList.remove('active');
                    x.style.borderColor = 'rgba(255,255,255,0.1)';
                    x.style.background  = 'rgba(255,255,255,0.03)';
                });
                b.classList.add('active');
                b.style.borderColor = 'rgba(52,152,219,0.4)';
                b.style.background  = 'rgba(52,152,219,0.08)';
                if (typeInput) typeInput.value = b.getAttribute('data-type');
            });
        });

        // --- Invio ---
        var sending = false;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (sending) return;

            var title = (document.getElementById('fb-title').value || '').trim();
            var desc  = (document.getElementById('fb-desc').value || '').trim();
            var type  = (typeInput && typeInput.value) || 'idea';
            var hp    = (document.getElementById('fb-hp').value || '');

            if (title.length < 3) {
                toast(form.dataset.msgValidate, 'error');
                return;
            }

            var meta = {
                username: (function () { try { return sessionStorage.getItem('espooUser') || ''; } catch (e) { return ''; } })(),
                version:  (window.GAME_VERSION && window.GAME_VERSION.toString) ? window.GAME_VERSION.toString() : (window.CACHE_VER || ''),
                url:      location.href,
                lang:     window.APP_LANG || navigator.language || '',
                screen:   (window.screen ? (screen.width + 'x' + screen.height) : '')
            };

            sending = true;
            var submitBtn   = document.getElementById('fb-submit');
            var submitLabel = document.getElementById('fb-submit-label');
            var oldLabel = submitLabel ? submitLabel.textContent : '';
            if (submitBtn) submitBtn.disabled = true;
            if (submitLabel) submitLabel.textContent = form.dataset.msgSending || '...';

            fetch(form.dataset.endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type, title: title, description: desc, website: hp, meta: meta })
            })
            .then(function (r) {
                return r.json()
                    .then(function (d) { return { ok: r.ok, data: d }; })
                    .catch(function () { return { ok: r.ok, data: {} }; });
            })
            .then(function (res) {
                if (res.ok && res.data && res.data.ok) {
                    toast(form.dataset.msgOk, 'success');
                    document.getElementById('fb-title').value = '';
                    document.getElementById('fb-desc').value = '';
                } else {
                    var detail = (res.data && res.data.error) ? (' (' + res.data.error + ')') : '';
                    toast((form.dataset.msgErr || 'Error') + detail, 'error');
                }
            })
            .catch(function () {
                toast(form.dataset.msgErr || 'Error', 'error');
            })
            .finally(function () {
                sending = false;
                if (submitBtn) submitBtn.disabled = false;
                if (submitLabel) submitLabel.textContent = oldLabel;
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
