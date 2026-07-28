# 🚨 Espòòò Clicker: The Ultimate Bug-Farming Simulator
### (v3.0 Refactor: The Bugs Never Die)

> A clicker game similar to Cookie Clicker, but with a lot of bugs... literally.

---

Welcome to **Espòòò Clicker**, the clicker game where your life becomes a never-ending cycle of finding and resolving digital disasters! You're not just a developer or a QA specialist; you are **The Clicker**, a god-like entity whose sole purpose is to alleviate the suffering of the perpetually surprised manager, Espòòò, by clicking his face until the bugs retreat. (They will be back.)

Every click solves a bug. Every solved bug gets you closer to buying an upgrade that generates bugs per second (BPS). The math checks out.

## 🚀 Key Features (Why is this your new life?)

* **The Click of Destiny:** Click the manager's face (known as Espòòò) to resolve your first batch of "Bug Risolti" (Solved Bugs). Be prepared for finger strain. You'll need it.
* **The Tool Acquisition Cycle:** Spend your hard-earned bugs on increasingly elaborate and metaphysical tools and teams:
    * **Assistente QA:** A minimum-wage apprentice to click for you.
    * **Jira Ticket:** The foundation of all digital bureaucracy.
    * **Metodologia Agile:** Buy a project management philosophy to solve bugs for you.
    * **AI Debugger:** The future is now, and it's farming bugs.
* **The Blue Screen of Destiny (ERRORE DI SISTEMA!):** Occasionally, your whole game system will crash with a dramatic blue screen, but don't worry—it gives you a massive BPS multiplier!. It's not a bug; it's a **feature** that rewards instability. Features an immersive, looping Blue Screen soundtrack.
* **Ticket Critico (The Golden Bug):** Watch out for the rare, shimmering "Ticket Critico". Click it quickly for a huge instant payoff, reminding you that sometimes, a single frantic fix pays better than planning.
* **Promozione (Prestige):** When you accumulate 1 Million bugs, the cycle of life and debugging becomes too much. You can perform a **Promotion (Reset)**. Lose everything, gain Prestige Points, and start over with a marginal, cumulative BPS boost. This is true progress.
* **Online Leaderboard (Podio):** Compete with other digital masochists to see who can farm the most meaningless points.

## 🛠️ Installation & Setup (For maximum misery)

A PHP front-end with a TypeScript/Vite game engine (bundled to `dist/`) and a **Supabase** backend for saves & leaderboard — **no local database required** (the old MySQL setup is gone). To run it locally you'll need a PHP server (**MAMP**/XAMPP) and **Node.js**:

1.  Install deps and build the game engine — **without this the game won't load**:
    ```bash
    npm install
    npm run build          # Vite → dist/game.modules.js  (use `npm run dev:v3` for live reload)
    ```
2.  Create your local config from the templates:
    ```bash
    cp php/config.example.php php/config.php               # instanceName + versions
    cp php/r2-config.example.php php/r2-config.php          # (optional) audio/video on Cloudflare R2
    cp php/trello-config.example.php php/trello-config.php  # (optional) "Segnala" feedback → Trello
    ```
3.  Serve the folder with PHP and open **`index.php`** (e.g. MAMP → `http://localhost:8888/Espo-Clicker/`).
4.  Start clicking.

> Leaderboard ("Podio") and cloud saves run on **Supabase Edge Functions**; the public keys already live in the client (`src/lib/backend-config.ts`), so there's nothing else to wire up.

**Disclaimer:** No actual QA or development teams were harmed in the making of this game. (We think.)

---
*Created with love and infinite bugs.*
