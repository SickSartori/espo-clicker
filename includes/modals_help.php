<div id="help-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-content" style="max-width: 600px; padding: 0; overflow: hidden; border: 1px solid #3498db; box-shadow: 0 0 30px rgba(52, 152, 219, 0.3); background: #0a0e14;">

        <div style="background: #05080c; color: #3498db; border-bottom: 1px solid rgba(52, 152, 219, 0.3); padding: 20px; text-align: center; position: relative;">
            <button class="modal-close-btn" style="z-index: 10;">&times;</button>
            <h2 style="margin: 0; font-size: 1.5rem;"><i class="fa-solid fa-book-journal-whills"></i> <?php echo $labels["help_titolo"]; ?></h2>
        </div>

        <div class="settings-content" style="padding: 0; max-height: 70vh; overflow-y: auto;">

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
    </div>
</div>