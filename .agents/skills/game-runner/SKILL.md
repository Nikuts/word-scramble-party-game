---
name: game-runner
description: Comprehensive workflow guide to run, test, and preview the Word Scramble Party Game and its UI Component Dev Harness in Antigravity.
---

# Word Scramble Party Game: Running, Testing & UI Previews

This skill provides step-by-step instructions for running the party game locally, testing game mechanics, and previewing UI components in isolation via Antigravity.

---

## 1. Running the Game Server

To run the local server with full Vite Hot Module Replacement (HMR) on port 3000:

```bash
npm start
```
* **Local Web Interface:** [http://localhost:3000](http://localhost:3000)
* **Local IP Network Play (Phones on same Wi-Fi):** `http://<your-local-ip>:3000`

---

## 2. Instant UI Component Dev Harness

Instead of playing a full multi-round game to test a single button or layout tweak, open the **UI Dev Harness** with mock data and live HMR:

* **Open Harness Directly:** [http://localhost:3000/?debug=1](http://localhost:3000/?debug=1)
* **Jump to Specific Screens:**
  * 📱 **Battle Answering (Single Line):** `http://localhost:3000/?debug=player_battle_single`
  * 📱 **Final Round Movie Poster (2-Part):** `http://localhost:3000/?debug=player_battle_movie`
  * 📱 **Mobile Voting Screen:** `http://localhost:3000/?debug=player_voting`
  * 📱 **Mobile Answering Phase:** `http://localhost:3000/?debug=player_question`
  * 📺 **Host TV Voting Arena (3-Way Brawl):** `http://localhost:3000/?debug=host_voting`
  * 📺 **Host Winner Podium & Superlatives:** `http://localhost:3000/?debug=host_podium`
  * 🎨 **Pixel Avatar Design Gallery:** `http://localhost:3000/?debug=avatar_gallery`
* **Switch Language via URL:** Append `&lang=ua` or `&lang=en` (e.g. `http://localhost:3000/?debug=player_battle_single&lang=ua`).

---

## 3. Automated Testing Commands

* **Run all Vitest unit tests (Single process, fast):**
  ```bash
  npx vitest run --fileParallelism=false
  ```
* **Run all Playwright E2E browser tests:**
  ```bash
  npx playwright test
  ```
* **Run a specific Playwright spec with UI:**
  ```bash
  npx playwright test e2e/gameFlow.spec.js --ui
  ```

---

## 4. Antigravity Browser Inspection

To have Antigravity inspect or verify a component visually, ask:
> *"Start the dev server and use browser subagent to take a screenshot of http://localhost:3000/?debug=player_battle_single"*
