<div id="help-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 600px; padding: 0; overflow: hidden; border: 1px solid #3498db; box-shadow: 0 0 30px rgba(52, 152, 219, 0.3); background: #0a0e14;">

        <div style="background: #05080c; color: #3498db; border-bottom: 1px solid rgba(52, 152, 219, 0.3); padding: 20px; text-align: center; position: relative;">
            <button class="modal-close-btn" style="z-index: 10;">&times;</button>
            <h2 style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 8px;"><i data-lucide="info"></i> <?php echo $labels["help_menu_titolo"]; ?></h2>
        </div>

        <!-- TAB BAR: Guida | Segnala -->
        <div class="help-tabs" style="display: flex; background: #05080c; border-bottom: 1px solid rgba(52, 152, 219, 0.2);">
            <button type="button" class="help-tab active" data-htab="guida" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: transparent; border: none; border-bottom: 2px solid #3498db; color: #3498db; font-size: 0.95rem; font-weight: 600; cursor: pointer;">
                <i data-lucide="book-open"></i> <?php echo $labels["navbar_guida"]; ?>
            </button>
            <button type="button" class="help-tab" data-htab="segnala" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #7f8c8d; font-size: 0.95rem; font-weight: 600; cursor: pointer;">
                <i data-lucide="bell"></i> <?php echo $labels["navbar_segnala"]; ?>
            </button>
        </div>

        <div class="settings-content" style="padding: 0; max-height: 65vh; overflow-y: auto;">

            <!-- ============ PANEL: GUIDA ============ -->
            <div class="help-panel" data-hpanel="guida">

                <div style="padding: 25px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <p style="color: #bdc3c7; font-size: 1rem; line-height: 1.6; margin: 0;">
                        <?php echo $labels["help_intro"]; ?>
                    </p>
                </div>

                <div style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(52, 152, 219, 0.02);">
                    <h3 style="color: #3498db; margin-top: 0; margin-bottom: 15px; font-size: 1.2rem;"><i class="fa-solid fa-computer-mouse"></i> <?php echo $labels["help_s1_titolo"]; ?></h3>
                    <ul style="color: #bdc3c7; line-height: 1.6; padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s1_li1"]; ?></li>
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s1_li2"]; ?></li>
                        <li><?php echo $labels["help_s1_li3"]; ?></li>
                    </ul>
                </div>

                <div style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="color: #e74c3c; margin-top: 0; margin-bottom: 15px; font-size: 1.2rem;"><i class="fa-solid fa-triangle-exclamation"></i> <?php echo $labels["help_s2_titolo"]; ?></h3>
                    <ul style="color: #bdc3c7; line-height: 1.6; padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s2_li1"]; ?></li>
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s2_li2"]; ?></li>
                        <li><?php echo $labels["help_s2_li3"]; ?></li>
                    </ul>
                </div>

                <div style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(241, 196, 15, 0.05);">
                    <h3 style="color: #f1c40f; margin-top: 0; margin-bottom: 15px; font-size: 1.2rem;"><i class="fa-solid fa-certificate"></i> <?php echo $labels["help_s3_titolo"]; ?></h3>
                    <p style="color: #bdc3c7; line-height: 1.6; margin-top: 0; margin-bottom: 15px;">
                        <?php echo $labels["help_s3_p"]; ?>
                    </p>
                    <ul style="color: #bdc3c7; line-height: 1.6; padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s3_li1"]; ?></li>
                        <li><?php echo $labels["help_s3_li2"]; ?></li>
                    </ul>
                </div>

                <div style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="color: #2ecc71; margin-top: 0; margin-bottom: 15px; font-size: 1.2rem;"><i class="fa-solid fa-gamepad"></i> <?php echo $labels["help_s4_titolo"]; ?></h3>
                    <ul style="color: #bdc3c7; line-height: 1.6; padding-left: 20px; margin: 0;">
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s4_li1"]; ?></li>
                        <li style="margin-bottom: 10px;"><?php echo $labels["help_s4_li2"]; ?></li>
                        <li><?php echo $labels["help_s4_li3"]; ?></li>
                    </ul>
                </div>

                <div style="padding: 20px 25px; background: rgba(155, 89, 182, 0.05);">
                    <h3 style="color: #9b59b6; margin-top: 0; margin-bottom: 15px; font-size: 1.2rem;"><i class="fa-solid fa-infinity"></i> <?php echo $labels["help_s5_titolo"]; ?></h3>
                    <p style="color: #bdc3c7; line-height: 1.6; margin: 0; font-style: italic;">
                        <?php echo $labels["help_s5_p"]; ?>
                    </p>
                </div>

            </div>

            <!-- ============ PANEL: SEGNALA ============ -->
            <div class="help-panel" data-hpanel="segnala" style="display: none;">
                <form id="feedback-form" autocomplete="off"
                      data-endpoint="php/trello-submit.php"
                      data-msg-ok="<?php echo $labels["feedback_toast_ok"]; ?>"
                      data-msg-err="<?php echo $labels["feedback_toast_err"]; ?>"
                      data-msg-validate="<?php echo $labels["feedback_toast_validate"]; ?>"
                      data-msg-sending="<?php echo $labels["feedback_toast_sending"]; ?>"
                      style="padding: 24px; margin: 0;">

                    <p style="color: #bdc3c7; font-size: 0.95rem; line-height: 1.6; margin: 0 0 18px;">
                        <?php echo $labels["feedback_intro"]; ?>
                    </p>

                    <div style="display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap;">
                        <button type="button" class="fb-type active" data-type="idea" style="flex: 1; min-width: 120px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 8px; border: 1px solid rgba(52,152,219,0.4); background: rgba(52,152,219,0.08); color: #ecf0f1; cursor: pointer; font-size: 0.9rem;"><i data-lucide="sparkles"></i> <?php echo $labels["feedback_type_idea"]; ?></button>
                        <button type="button" class="fb-type" data-type="bug" style="flex: 1; min-width: 120px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #ecf0f1; cursor: pointer; font-size: 0.9rem;"><i data-lucide="bug"></i> <?php echo $labels["feedback_type_bug"]; ?></button>
                        <button type="button" class="fb-type" data-type="improvement" style="flex: 1; min-width: 120px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #ecf0f1; cursor: pointer; font-size: 0.9rem;"><i data-lucide="trending-up"></i> <?php echo $labels["feedback_type_improvement"]; ?></button>
                    </div>
                    <input type="hidden" id="fb-type" value="idea">

                    <label for="fb-title" style="display: block; color: #3498db; font-size: 0.85rem; margin-bottom: 6px;"><?php echo $labels["feedback_label_titolo"]; ?></label>
                    <input type="text" id="fb-title" maxlength="200" placeholder="<?php echo $labels["feedback_ph_titolo"]; ?>"
                           style="width: 100%; box-sizing: border-box; padding: 11px; margin-bottom: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: #05080c; color: #ecf0f1; font-size: 0.95rem;">

                    <label for="fb-desc" style="display: block; color: #3498db; font-size: 0.85rem; margin-bottom: 6px;"><?php echo $labels["feedback_label_desc"]; ?></label>
                    <textarea id="fb-desc" rows="5" maxlength="4000" placeholder="<?php echo $labels["feedback_ph_desc"]; ?>"
                              style="width: 100%; box-sizing: border-box; padding: 11px; margin-bottom: 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: #05080c; color: #ecf0f1; font-size: 0.95rem; resize: vertical;"></textarea>

                    <!-- Honeypot anti-bot: fuori schermo, invisibile agli umani. Se compilato, il server scarta. -->
                    <input type="text" id="fb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"
                           style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0;">

                    <p style="color: #7f8c8d; font-size: 0.75rem; line-height: 1.5; margin: 2px 0 18px; display: flex; align-items: flex-start; gap: 6px;">
                        <i data-lucide="lock"></i> <span><?php echo $labels["feedback_privacy"]; ?></span>
                    </p>

                    <button type="submit" id="fb-submit"
                            style="width: 100%; padding: 13px; border: none; border-radius: 8px; background: #3498db; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer;">
                        <span id="fb-submit-label"><?php echo $labels["feedback_invia"]; ?></span>
                    </button>
                </form>
            </div>

        </div>
    </div>
</div>
