<div id="prestige-wrapper" class="tab-content" style="display: none;">
        
        <div id="prestige-section" class="store-section" style="display: none; border-bottom: 2px solid rgba(74, 101, 130, 0.5); margin-bottom: 15px;">
            <div class="prestige-info" style="text-align: center;">
                <p style="font-size: 0.9rem; color: #bdc3c7;">Resettando ora otterrai:</p>
                <p><span id="prestige-gain-display" style="font-size: 1.4rem; font-weight: bold; color: #2ecc71;">0</span> Punti</p>
            </div>
            <button id="prestige-btn" class="buy-btn danger-btn" style="margin-top: 10px;">Ottieni Promozione</button>
        </div>

        <div id="prestige-store" style="display: block;">
            <div class="section-header">
                <h2 style="color: #f1c40f;">Laboratorio</h2>
                <button id="filter-btn-lab" class="filter-btn" data-list="prestige-list-container">
                    <span class="icon">👁️</span> <span class="text">Tutti</span>
                </button>
            </div>
            
            <div id="prestige-list-container">
                <div id="upgrade-sinergia" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Sinergia Manageriale</span>
                        <div class="upgrade-desc">Bonus Carriera sale più velocemente.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-sinergia">1</span> Pt</div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-sinergia" class="upgrade-count">0</span>
                        <button id="buy-sinergia" class="buy-btn prestige-btn" data-upgrade-name="sinergia">Compra</button>
                    </div>
                </div>
                
                <div id="upgrade-accelerazione" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Accelerazione Iniziale</span>
                        <div class="upgrade-desc">Start con 1 Assistente QA.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-accelerazione">2</span> Pt</div>
                    </div>
                    <button id="buy-accelerazione" class="buy-btn prestige-btn" data-upgrade-name="accelerazione">Compra</button>
                </div>
                
                <div id="upgrade-ticketPremium" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Ticket Premium</span>
                        <div class="upgrade-desc">Critici x2 più frequenti.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-ticketPremium">5</span> Pt</div>
                    </div>
                    <button id="buy-ticketPremium" class="buy-btn prestige-btn" data-upgrade-name="ticketPremium">Compra</button>
                </div>

                <div id="upgrade-outsourcing" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Outsourcing</span>
                        <div class="upgrade-desc">-1% Costo Edifici/liv.</div>
                        <div class="upgrade-cost">Costo: <span id="cost-outsourcing">10</span> Pt</div>
                    </div>
                    <div class="upgrade-actions">
                        <span id="count-outsourcing" class="upgrade-count">0</span>
                        <button id="buy-outsourcing" class="buy-btn prestige-btn" data-upgrade-name="outsourcing">Compra</button>
                    </div>
                </div>

                <div id="upgrade-paracadute" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Paracadute d'Oro</span>
                        <div class="upgrade-desc">Start con 5% bug precedenti.</div>
                         <div class="upgrade-cost">Costo: <span id="cost-paracadute">25</span> Pt</div>
                    </div>
                    <button id="buy-paracadute" class="buy-btn prestige-btn" data-upgrade-name="paracadute">Compra</button>
                </div>

                <div id="upgrade-crunchTime" class="prestige-upgrade">
                    <div class="upgrade-details">
                        <span class="upgrade-name">Crunch Time</span>
                        <div class="upgrade-desc">Abilità Attiva: BPS x3.</div>
                         <div class="upgrade-cost">Costo: <span id="cost-crunchTime">50</span> Pt</div>
                    </div>
                    <button id="buy-crunchTime" class="buy-btn prestige-btn" data-upgrade-name="crunchTime">Compra</button>
                </div>
            </div> 
            
            <div id="prestige-empty" class="empty-state-msg" style="display: none;">
                Tutti i potenziamenti Lab acquisiti!
            </div>
        </div>
    </div>