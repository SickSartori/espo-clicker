/* =====================================================================
 * social.js — UI Amici (Fase 3).
 * Cablata sulle Edge Functions Supabase via window.EspoBackend.call().
 * Auth: save_token della sessione (Game.getSaveToken()), come gli altri
 * endpoint (login-register, save-progress, change-*).
 * Vive dentro la tab "Amici" dell'hub nome-utente (#user-hub-modal).
 * ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {

    function initSocial() {
        const Game = window.EspooClicker;
        if (!Game) return;

        const hub  = document.getElementById('user-hub-modal');
        const pane = hub ? hub.querySelector('.hub-pane[data-hubpane="amici"]') : null;
        if (!pane) return;

        const friendsView  = document.getElementById('friends-view');
        const searchInput  = document.getElementById('friend-search-input');
        const searchBtn    = document.getElementById('friend-search-btn');
        const searchResult = document.getElementById('friend-search-result');
        const requestsBox  = document.getElementById('friends-requests');
        const listTitle    = document.getElementById('friends-list-title');
        const listBox      = document.getElementById('friends-list');
        const emptyBox     = document.getElementById('friends-empty');
        const profilePanel = document.getElementById('friend-profile-panel');
        const badgeEl      = document.getElementById('user-hub-badge');

        const T = () => (window.gameData && gameData.texts && gameData.texts.social) || {};

        function escapeHTML(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
        }

        // Avatar skin — stessa logica di podio.js (rarità → colore bordo)
        const rColors = { common: '#bdc3c7', rare: '#3498db', epic: '#9b59b6', legendary: '#f1c40f', divine: '#ffee90', christmas: '#e74c3c' };
        function skinVisual(skinId) {
            const skins = (window.gameData && gameData.skins) || {};
            const sd = skins[skinId] || skins['default'] || {};
            return {
                img: sd.img ? `assets/image/${sd.img}` : 'assets/image/espo.webp',
                border: rColors[sd.rarity] || rColors.common,
                name: sd.name || skinId
            };
        }

        // "Online" (< 5 min) oppure "visto Nm/h/g fa" — secondi calcolati lato server
        function onlineLabel(secs) {
            const t = T();
            if (secs === null || secs === undefined) return { cls: 'off', text: t.never || 'mai online' };
            if (secs < 300) return { cls: 'on', text: t.online || 'Online' };
            const m = Math.floor(secs / 60), h = Math.floor(secs / 3600), d = Math.floor(secs / 86400);
            let unit;
            if (d >= 1) unit = d + (t.daysAbbr || 'g fa');
            else if (h >= 1) unit = h + (t.hoursAbbr || 'h fa');
            else unit = Math.max(1, m) + (t.minsAbbr || 'm fa');
            return { cls: 'off', text: (t.lastSeen || 'visto') + ' ' + unit };
        }

        function toast(msg, type) { if (msg && Game.showToast) Game.showToast(msg, type || 'info'); }

        // Badge navbar: messaggi non letti + richieste in arrivo
        async function updateBadge() {
            const token = (typeof Game.getSaveToken === 'function') ? Game.getSaveToken() : null;
            if (!token || !badgeEl) return;
            const data = await sb('friends-poll', {});
            if (!data || data.status !== 'success') return;
            const total = (data.unseenMessages || 0) + (data.pendingRequests || 0);
            if (total > 0) { badgeEl.textContent = total > 9 ? '9+' : String(total); badgeEl.hidden = false; }
            else { badgeEl.hidden = true; }
        }

        // Chiamata a una Edge Function con il token di sessione iniettato
        async function sb(slug, payload) {
            const token = (typeof Game.getSaveToken === 'function') ? Game.getSaveToken() : null;
            if (!token) return { status: 'token_expired', message: 'no-token' };
            try {
                const res = await window.EspoBackend.call(slug, Object.assign({ save_token: token }, payload || {}));
                return await res.json();
            } catch (e) {
                return { status: 'error', message: (T().error || 'Errore di rete.') };
            }
        }

        function statusHTML(on) {
            return `<span class="friend-status ${on.cls}">${on.cls === 'on' ? '<i class="fa-solid fa-circle"></i> ' : ''}${escapeHTML(on.text)}</span>`;
        }

        // Riga amico/richiesta. context: 'friend' | 'incoming' | 'outgoing'
        function friendRowHTML(f, context) {
            const sv = skinVisual(f.equippedSkin);
            const on = onlineLabel(f.lastSeenSecondsAgo);
            let actions = '';
            if (context === 'friend') {
                actions = `<button class="friend-open-btn" data-open="${escapeHTML(f.id)}" aria-label="${T().back || ''}"><i class="fa-solid fa-chevron-right"></i></button>`;
            } else if (context === 'incoming') {
                actions =
                    `<button class="friend-mini-btn accept" data-act="accept" data-id="${escapeHTML(f.id)}" title="${T().accept || ''}"><i class="fa-solid fa-check"></i></button>` +
                    `<button class="friend-mini-btn reject" data-act="reject" data-id="${escapeHTML(f.id)}" title="${T().reject || ''}"><i class="fa-solid fa-xmark"></i></button>`;
            } else {
                actions = `<span class="friend-pending-tag">${T().pending || 'in attesa'}</span>`;
            }
            return `
                <div class="friend-row">
                    <img src="${sv.img}" class="friend-avatar" style="border-color:${sv.border}" alt="">
                    <div class="friend-info">
                        <span class="friend-name">${escapeHTML(f.username)}</span>
                        ${statusHTML(on)}
                    </div>
                    <div class="friend-actions">${actions}</div>
                </div>`;
        }

        // ---- Flussi ----
        async function loadFriends() {
            closeProfile();
            listBox.innerHTML = `<div class="friends-loading">${T().loading || 'Carico…'}</div>`;
            requestsBox.innerHTML = '';
            emptyBox.style.display = 'none';

            const data = await sb('friends-list', {});
            if (data.status !== 'success') {
                listBox.innerHTML = `<div class="friends-error">${escapeHTML(data.message || T().error || 'Errore')}</div>`;
                return;
            }

            let reqHTML = '';
            if (data.incoming && data.incoming.length) {
                reqHTML += `<div class="friends-section-title">${T().incoming || 'Richieste ricevute'} <span class="cnt">${data.incoming.length}</span></div>`;
                reqHTML += data.incoming.map(f => friendRowHTML(f, 'incoming')).join('');
            }
            if (data.outgoing && data.outgoing.length) {
                reqHTML += `<div class="friends-section-title">${T().outgoing || 'Richieste inviate'}</div>`;
                reqHTML += data.outgoing.map(f => friendRowHTML(f, 'outgoing')).join('');
            }
            requestsBox.innerHTML = reqHTML;

            const friends = data.friends || [];
            if (friends.length) {
                listTitle.style.display = '';
                listTitle.innerHTML = `${T().yourFriends || 'I tuoi amici'} <span class="cnt">${friends.length}</span>`;
                listBox.innerHTML = friends.map(f => friendRowHTML(f, 'friend')).join('');
            } else {
                listTitle.style.display = 'none';
                listBox.innerHTML = '';
                emptyBox.style.display = (reqHTML ? 'none' : '');
            }
            updateBadge();
        }

        // Riga risultato ricerca / suggerimento, con azione in base alla relazione
        function searchRowHTML(u, relation) {
            const sv = skinVisual(u.equippedSkin);
            const on = onlineLabel(u.lastSeenSecondsAgo);
            let action;
            if (relation === 'accepted') action = `<span class="friend-pending-tag ok">${T().alreadyFriends || 'Già amici'}</span>`;
            else if (relation === 'pending_out') action = `<span class="friend-pending-tag">${T().pending || 'in attesa'}</span>`;
            else if (relation === 'pending_in') action = `<button class="friend-mini-btn accept" data-act="accept" data-id="${escapeHTML(u.id)}" title="${T().accept || ''}"><i class="fa-solid fa-check"></i></button>`;
            else action = `<button class="friend-add-btn" data-add="${escapeHTML(u.id)}"><i class="fa-solid fa-user-plus"></i> ${T().add || 'Aggiungi'}</button>`;
            return `
                <div class="friend-row search">
                    <img src="${sv.img}" class="friend-avatar" style="border-color:${sv.border}" alt="">
                    <div class="friend-info">
                        <span class="friend-name">${escapeHTML(u.username)}</span>
                        ${statusHTML(on)}
                    </div>
                    <div class="friend-actions">${action}</div>
                </div>`;
        }

        // Ricerca per nome PARZIALE (>=2 caratteri). Con query vuota → suggerimenti
        // (utenti non ancora amici). allowSuggestions=true consente la modalità vuota.
        async function doSearch(allowSuggestions) {
            const q = (searchInput.value || '').trim();
            if (!q && !allowSuggestions) { searchResult.innerHTML = ''; return; }
            searchResult.innerHTML = `<div class="friends-loading">${(q ? T().searching : T().loading) || '…'}</div>`;

            const data = await sb('friends-search', { query: q });
            // Scarta risposte stantie: se nel frattempo il campo è cambiato, ignora
            if ((searchInput.value || '').trim() !== q) return;

            if (data.status !== 'success') {
                searchResult.innerHTML = `<div class="friends-error">${escapeHTML(data.message || '')}</div>`;
                return;
            }
            const results = data.results || [];
            if (!results.length) {
                searchResult.innerHTML = q ? `<div class="friends-noresult">${T().notFound || 'Nessun utente.'}</div>` : '';
                return;
            }
            let html = '';
            if (data.mode === 'suggestions') html += `<div class="friends-section-title">${T().suggestions || 'Suggeriti'}</div>`;
            html += results.map(r => searchRowHTML(r.user, r.relation)).join('');
            searchResult.innerHTML = html;
        }

        // Dopo una mutazione: riaggiorna il box ricerca solo se sta mostrando qualcosa
        function refreshSearch() {
            if (searchResult.innerHTML.trim()) doSearch(true);
        }

        async function sendRequest(id) {
            const data = await sb('friends-request', { targetId: id });
            toast(data.message || '', data.status === 'success' ? 'success' : 'error');
            refreshSearch();   // la persona aggiunta passa a "in attesa" nella lista
            loadFriends();
        }

        async function respond(id, action) {
            const data = await sb('friends-respond', { requesterId: id, action: action });
            if (data.status === 'success') toast(action === 'accept' ? (T().accepted || '') : (T().rejected || ''), 'success');
            else toast(data.message || '', 'error');
            refreshSearch();
            loadFriends();
        }

        async function removeFriend(id) {
            if (!confirm(T().removeConfirm || 'Rimuovere questo amico?')) return;
            const data = await sb('friends-remove', { friendId: id });
            if (data.status === 'success') toast(T().removed || '', 'info');
            loadFriends();
        }

        // ---- Chat emoji (polling ~3s; Realtime innestabile sopra) ----
        const CHAT_EMOJI = ['👍','😂','😍','🥳','😎','🤩','😭','😡','🔥','💪','🎉','🐛','💀','❤️','👀','🚀'];
        let _chatFriendId = null, _chatTimer = null, _chatLastCount = -1, _profileFriendId = null;

        function renderChatBubbles(messages) {
            const log = document.getElementById('fp-chat-log');
            if (!log) return;
            if (!messages.length) {
                log.innerHTML = `<div class="fp-chat-empty">${T().chatEmpty || 'Invia la prima emoji!'}</div>`;
                return;
            }
            log.innerHTML = messages.map(m => `<div class="fp-bubble ${m.mine ? 'mine' : 'theirs'}">${escapeHTML(m.emoji)}</div>`).join('');
            log.scrollTop = log.scrollHeight;
        }

        async function loadChat(friendId, silent) {
            const data = await sb('friends-messages', { friendId: friendId });
            if (!data || data.status !== 'success') return;
            const msgs = data.messages || [];
            if (silent && msgs.length === _chatLastCount) return; // niente di nuovo → no re-render (no flicker)
            _chatLastCount = msgs.length;
            renderChatBubbles(msgs);
        }

        async function sendEmoji(emoji) {
            if (!_chatFriendId) return;
            const log = document.getElementById('fp-chat-log');
            if (log) { // append ottimistico
                const empty = log.querySelector('.fp-chat-empty');
                if (empty) log.innerHTML = '';
                log.insertAdjacentHTML('beforeend', `<div class="fp-bubble mine">${escapeHTML(emoji)}</div>`);
                log.scrollTop = log.scrollHeight;
                _chatLastCount = -1;
            }
            const data = await sb('friends-send-emoji', { friendId: _chatFriendId, emoji: emoji });
            if (!data || data.status !== 'success') toast((data && data.message) || '', 'error');
            loadChat(_chatFriendId, false);
        }

        async function startChat(friendId) {
            _chatFriendId = friendId;
            _chatLastCount = -1;
            const pal = document.querySelector('#friend-profile-panel .fp-chat-palette');
            if (pal) pal.innerHTML = CHAT_EMOJI.map(e => `<button class="fp-emoji-btn" data-emoji="${e}">${e}</button>`).join('');
            await loadChat(friendId, false); // marca come letti i messaggi in arrivo
            updateBadge();                   // → il badge cala
            clearInterval(_chatTimer);
            _chatTimer = setInterval(() => loadChat(friendId, true), 3000);
        }

        function stopChat() {
            clearInterval(_chatTimer);
            _chatTimer = null;
            _chatFriendId = null;
            _chatLastCount = -1;
        }

        // Sotto-tab del profilo amico: Statistiche | Armadietto | Chat
        function setFpTab(target) {
            profilePanel.querySelectorAll('.fp-tab').forEach(t =>
                t.classList.toggle('active', t.getAttribute('data-fptab') === target));
            profilePanel.querySelectorAll('.fp-pane').forEach(p => {
                const on = p.getAttribute('data-fppane') === target;
                p.classList.toggle('active', on);
                p.style.display = on ? '' : 'none';
            });
            // La chat "legge" (marca seen) e fa polling SOLO quando apri la sua tab
            if (target === 'chat') startChat(_profileFriendId);
            else stopChat();
        }

        // ---- Pannello profilo amico ----
        async function openProfile(id) {
            friendsView.style.display = 'none';
            profilePanel.style.display = '';
            profilePanel.innerHTML = `<div class="friends-loading">${T().loading || 'Carico…'}</div>`;

            const data = await sb('friend-profile', { friendId: id });
            if (data.status !== 'success') {
                profilePanel.innerHTML =
                    `<div class="fp-head"><button class="fp-back"><i class="fa-solid fa-chevron-left"></i> ${T().back || 'Indietro'}</button></div>` +
                    `<div class="friends-error">${escapeHTML(data.message || '')}</div>`;
                return;
            }

            const p = data.profile, sv = skinVisual(p.equippedSkin), on = onlineLabel(p.lastSeenSecondsAgo);
            const fmt = (v) => (v === null || v === undefined) ? '—' : (Game.formatNumber ? Game.formatNumber(v) : v);
            const playH = (p.totalPlayTime != null) ? (p.totalPlayTime / 3600000).toFixed(1) + 'h' : '—';
            const combo = (p.longestCombo != null) ? p.longestCombo : '—';

            const unlocked = Array.isArray(p.skinsUnlocked) ? p.skinsUnlocked : [];
            const locker = unlocked.length
                ? unlocked.map(sid => { const s = skinVisual(sid); return `<div class="locker-skin" title="${escapeHTML(s.name)}"><img src="${s.img}" style="border-color:${s.border}" alt=""></div>`; }).join('')
                : `<div class="friends-noresult">${T().noSkins || '—'}</div>`;

            profilePanel.innerHTML = `
                <div class="fp-head">
                    <button class="fp-back"><i class="fa-solid fa-chevron-left"></i> ${T().back || 'Indietro'}</button>
                    <button class="fp-remove" data-remove="${escapeHTML(p.id)}" title="${T().removeFriend || ''}"><i class="fa-solid fa-user-minus"></i></button>
                </div>
                <div class="fp-hero">
                    <img src="${sv.img}" class="fp-avatar" style="border-color:${sv.border}" alt="">
                    <div class="fp-name">${escapeHTML(p.username)}</div>
                    ${statusHTML(on)}
                </div>
                <div class="fp-tabs" role="tablist">
                    <button class="fp-tab active" data-fptab="stats"><i class="fa-solid fa-chart-simple"></i> ${T().tabStats || 'Statistiche'}</button>
                    <button class="fp-tab" data-fptab="locker"><i class="fa-solid fa-shirt"></i> ${T().tabLocker || 'Armadietto'}</button>
                    <button class="fp-tab" data-fptab="chat"><i class="fa-solid fa-comment-dots"></i> ${T().tabChat || 'Chat'}</button>
                </div>
                <div class="fp-pane active" data-fppane="stats">
                    <div class="fp-stats">
                        <div class="fp-stat"><span>${fmt(p.score)}</span><label>${T().stScore || ''}</label></div>
                        <div class="fp-stat"><span>${p.prestige || 0}</span><label>${T().stPrestige || ''}</label></div>
                        <div class="fp-stat"><span>${p.totalFormattazioni || 0}</span><label>NG+</label></div>
                        <div class="fp-stat"><span>${fmt(p.totalClicks)}</span><label>${T().stClicks || ''}</label></div>
                        <div class="fp-stat"><span>${playH}</span><label>${T().stPlaytime || ''}</label></div>
                        <div class="fp-stat"><span>${combo}</span><label>${T().stCombo || ''}</label></div>
                    </div>
                </div>
                <div class="fp-pane" data-fppane="locker" style="display:none">
                    <div class="fp-locker-title">${T().locker || 'Armadietto'} <span class="cnt">${p.skinsCount != null ? p.skinsCount : unlocked.length}</span></div>
                    <div class="fp-locker">${locker}</div>
                </div>
                <div class="fp-pane" data-fppane="chat" style="display:none">
                    <div class="fp-chat">
                        <div class="fp-chat-log" id="fp-chat-log"></div>
                        <div class="fp-chat-palette"></div>
                    </div>
                </div>`;
            _profileFriendId = p.id;
            setFpTab('stats');
        }

        function closeProfile() {
            stopChat();
            _profileFriendId = null;
            profilePanel.style.display = 'none';
            profilePanel.innerHTML = '';
            if (friendsView) friendsView.style.display = '';
        }

        // ---- Eventi (delega su tutta la pane) ----
        let _searchTimer = null;
        if (searchInput) {
            // Ricerca live mentre si digita (debounce)
            searchInput.addEventListener('input', () => { clearTimeout(_searchTimer); _searchTimer = setTimeout(() => doSearch(true), 280); });
            // Al focus, se vuoto, mostra i suggerimenti
            searchInput.addEventListener('focus', () => { if (!(searchInput.value || '').trim()) doSearch(true); });
            searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(_searchTimer); doSearch(true); } });
        }
        if (searchBtn) searchBtn.addEventListener('click', () => { clearTimeout(_searchTimer); doSearch(true); });

        pane.addEventListener('click', (e) => {
            const add = e.target.closest('[data-add]');
            if (add) { sendRequest(add.getAttribute('data-add')); return; }
            const mini = e.target.closest('.friend-mini-btn[data-act]');
            if (mini) { respond(mini.getAttribute('data-id'), mini.getAttribute('data-act')); return; }
            const open = e.target.closest('[data-open]');
            if (open) { openProfile(open.getAttribute('data-open')); return; }
            const fptab = e.target.closest('.fp-tab[data-fptab]');
            if (fptab) { setFpTab(fptab.getAttribute('data-fptab')); return; }
            const back = e.target.closest('.fp-back');
            if (back) { closeProfile(); return; }
            const rem = e.target.closest('[data-remove]');
            if (rem) { removeFriend(rem.getAttribute('data-remove')); return; }
            const emo = e.target.closest('.fp-emoji-btn[data-emoji]');
            if (emo) { sendEmoji(emo.getAttribute('data-emoji')); return; }
        });

        // Testi statici (placeholder + stato vuoto) dalla lingua attiva
        function applyStaticTexts() {
            const t = T();
            if (searchInput) searchInput.placeholder = t.searchPlaceholder || 'Cerca…';
            const fe = emptyBox ? emptyBox.querySelector('.fe-title') : null;
            const fd = emptyBox ? emptyBox.querySelector('.fe-desc') : null;
            if (fe) fe.textContent = t.emptyTitle || '';
            if (fd) fd.textContent = t.emptyDesc || '';
        }
        applyStaticTexts();

        // Carica la lista quando si apre la tab Amici
        const amiciTab = hub.querySelector('.hub-tab[data-hubtab="amici"]');
        if (amiciTab) amiciTab.addEventListener('click', () => {
            applyStaticTexts();
            if (searchInput) searchInput.value = '';
            if (searchResult) searchResult.innerHTML = '';
            loadFriends();
        });

        window.EspoSocial = { reload: loadFriends, refreshBadge: updateBadge };
        setTimeout(updateBadge, 3000);   // primo controllo poco dopo il login
        setInterval(updateBadge, 45000); // poi ogni 45s
    }

    if (window.EspooClicker) initSocial();
    else {
        const iv = setInterval(() => { if (window.EspooClicker) { clearInterval(iv); initSocial(); } }, 50);
    }
});
