# Word Scramble Party Game

A real-time, local multiplayer word game for 3 to 14 players. The game leverages the Google Gemini API for dynamic content generation, creating a unique experience every time you play. It features creative question-answering, "word scramble" style battles using players' own words, dynamic 1-on-1 showdowns and 3-way brawls, and a climactic final dialogue battle.

**Core Technologies:** Node.js, Express, Socket.io, Svelte, TailwindCSS, Gemini API.

---

## 🚀 Core Features

- **Local Multiplayer (3-14 Players):** Designed for parties on a shared local network. One device acts as a "Host Display" (e.g., a TV or laptop), while players use their phones or tablets to play.
- **Dynamic 1-on-1 Showdowns, 3-Way Brawls & 4-Way Brawls:**
    - **Pacing Optimization for Large Groups:**
      - **3 to 8 Players**: Standard 2-player duos ($N$ battles per round).
      - **9 Players**: Pure 3-player trios (6 battles per round).
      - **10, 12, 14 Players**: High-energy 4-player quads (5, 6, and 7 battles per round).
      - **11 & 13 Players**: Balanced hybrid of 4-player quads + 3-player trios (6 and 7 battles per round).
    - **TV Display Presentation Framing:** Battles are dynamically badged on the Host TV display and mobile controllers as **"⚡ 1-on-1 Showdown"**, **"💥 3-Way Brawl"**, or **"🔥 4-Way Brawl"**, with dynamic 2, 3, and 4-card responsive layouts.
    - **Fairness Guarantee:** Every player participates in **exactly 2 battles per round** and faces completely distinct opponents in each battle. Group assignments rotate across rounds.

    #### 🎮 Player Counts & Battle Structure Matrix

    | Player Count | Total Slots ($2N$) | Matchup Partition | Battles / Round | Active Voters / Battle | Primary Battle Format |
    | :---: | :---: | :---: | :---: | :---: | :--- |
    | **3** | 6 | 3 Duos | **3** | 1 | ⚡ 1-on-1 Showdowns |
    | **4** | 8 | 4 Duos | **4** | 2 | ⚡ 1-on-1 Showdowns |
    | **5** | 10 | 5 Duos | **5** | 3 | ⚡ 1-on-1 Showdowns |
    | **6** | 12 | 6 Duos | **6** | 4 | ⚡ 1-on-1 Showdowns |
    | **7** | 14 | 7 Duos | **7** | 5 | ⚡ 1-on-1 Showdowns |
    | **8** | 16 | 8 Duos | **8** | 6 | ⚡ 1-on-1 Showdowns |
    | **9** | 18 | 6 Trios | **6** | 6 | 💥 3-Way Brawls |
    | **10** | 20 | 5 Quads | **5** | 6 | 🔥 4-Way Brawls |
    | **11** | 22 | 4 Quads + 2 Trios | **6** | 7 (Quads) / 8 (Trios) | Balanced Hybrid (Rotates each round) |
    | **12** | 24 | 6 Quads | **6** | 8 | 🔥 4-Way Brawls |
    | **13** | 26 | 5 Quads + 2 Trios | **7** | 9 (Quads) / 10 (Trios) | Balanced Hybrid (Rotates each round) |
    | **14** *(Max)* | 28 | 7 Quads | **7** | 10 | 🔥 4-Way Brawls |

- **Easy Connection with QR Codes:** The host screen displays a QR code that players can scan. This takes them directly to the game's page and **automatically pre-fills the Game ID**, making it incredibly fast to join a lobby.
- **In-Game Tutorial & Rules:** A dedicated "How to Play" screen, accessible directly from the main menu (after language selection) and during the lobby, provides a quick, multilingual guide to the game rules in the chosen language.
- **Expressive Image Avatars:** Players can choose from a fun selection of 20 different character avatars (including aliens, wizards, and zombies) to represent themselves, adding a touch of personal flair to the game.
- **Mobile-First UI:** The core gameplay, including an intuitive click-to-add and drag-to-reorder word scramble, is fully functional and optimized for mobile and touch devices.
- **Immersive Audio & Visuals:** 
    - **Smooth Screen Transitions:** View changes are handled with a clean and simple fade effect, ensuring a smooth user experience.
    - **Dynamic Synthwave Background:** The entire game is set against an animated, retro-futuristic grid that scrolls towards the viewer, enhancing the "Neon Arcade" theme.
    - **Segmented Timer Display:** The countdown timer is rendered as a retro 7-segment display, which flashes red when time is low, adding to the arcade-style tension.
    - **Animated Score Ticker:** When points are awarded, scores don't just appear—they animate smoothly. The final results screen features a dramatic score ticker, and individual scores in the sidebar and player HUD animate as well, providing satisfying visual feedback.
    - **Themed Loading Messages:** A pool of funny, themed loading messages like "Reticulating splines..." or "Teaching the AI about sarcasm..." keeps players entertained during brief waits for AI content generation.
- **Bilingual Support:** Fully playable and internationalized for both **English** and **Ukrainian**.
- **Dynamic AI Content Generation & Background Pre-fetching:** Utilizes the Google Gemini API to generate unique game content for every match:
    - **Themes & Custom Party Theme Input:** Generates 3 distinct AI themes for the host to choose from, or allows entering a custom party theme (e.g. "Tech Startups", "Ukrainian Folklore", "90s Nostalgia") directly from either the phone controller or the TV display screen.
    - **Topic Reload Button & Silly Theme Generation:** The lobby provides a dedicated **"🔄 Reload Topics"** button on both the Host TV display and the mobile Host controller to fetch 3 fresh themes at will. When **Silly Mode** is enabled, it automatically refreshes the lobby with wacky and absurd themes.
    - **Background Pre-fetching (Zero Loading Lag):** While players are actively typing answers in Phase 1 or voting in battles, the server pre-fetches the next round's questions, battle prompts, and final movie premise data in the background. Round transitions happen instantly without stalling on "Generating Round...".
    - **Simpler Conversational English (B1/B2):** All generated and fallback prompts are calibrated for accessible, conversational English.
    - **Thematic Battle Prompt Keyword Anchoring:** Battle prompts explicitly weave concrete keywords from the chosen game topic directly into the prompt sentence, ensuring prompts are clearly contextualized and intuitive on their own.
    - **Questions & Battle Prompts:** Generates open-ended questions for each player in each round and tailored battle prompts.
    - **Final Round:** For the grand finale, it creates a unique movie genre and a punchy 8–12 word premise for finalists to create a movie title and tagline for.
- **One-Time +30s Time Boost Bonus (1 Per Game):**
    - Each player receives **1 strategic +30s Time Boost token per game** that can be activated during either the Question Phase or the Battle Answering Phase.
    - Activating the boost extends the server phase countdown by 30 seconds (capped at 3 minutes) and broadcasts a room-wide alert and sound effect on the Host TV display. Tokens are strictly limited to one use per player across all 3 rounds and reset on game restart.
- **Battle History & Native Mobile Share (iOS / Android / Desktop):**
    - From the final results screen, players can review a complete history of every battle from the game, including 1-on-1 showdowns, 3-way brawls, and 4-way brawls.
    - Each battle card can be exported in vertical (story/phone) or landscape orientation using the **Web Share API (`navigator.share`)** on iOS Safari and mobile devices, or downloaded directly on desktop browsers.
- **Voting Anonymity on Host Display:** During battle voting, voter identities are kept completely secret. The Host display shows an anonymous live progress bar (`🗳️ X / Y Players Voted`) rather than voter name chips, preventing players from deducing who is competing in 1-on-1 matchups.
- **Customizable Game Modes:**
    - **Themed UI Skins:** The host can choose from several neon color palettes (e.g., Arcade, Vaporwave, Outrun) to customize the visual theme of the game.
    - **Silly Mode:** Toggles the AI to generate wacky, absurd, and humorous content, and refreshes the lobby with silly topics.
    - **18+ Mode:** Toggles the AI to generate adult-oriented, edgy, or suggestive content.
    - **Slowpoke Mode:** Increases all game timers for a more relaxed and thoughtful pace.
    - **Flexible Ukrainian Prompts:** To address the grammatical complexity of the Ukrainian language, the AI can be configured to generate more open-ended battle prompts (e.g., "Describe your ideal day: ____") instead of strict fill-in-the-blanks, making it easier and more fun to form creative answers.
- **Resilient & Fair Gameplay:**
    - **Question Progress & Reconnection Hydration:** Mobile screens display clear progress indicators (`Question 1/2`, `Battle 1/2`) and automatically hydrate already submitted answers on reconnect without re-prompting.
    - **Resilient Reconnection:** WebSocket client retries continuously with exponential backoff and automatically reconnects on `visibilitychange` (when mobile browser tab is re-opened) or when the device comes back online. A manual "Tap to Reconnect" option is available if connection stalls.
    - **Live Player Status Display:** The Host Display shows a real-time grid of all players during the question and battle answering phases with individual progress counters.
    - **AI Fallback System:** If the Gemini API fails **3 consecutive times**, the game seamlessly switches to a large pool of high-quality, pre-written content, ensuring the game is always playable.
    - **Smart Reconnection:** Disconnected players have a **5-minute window** to rejoin a game in progress. Their score, state, and any partially completed answers are fully restored. If all players disconnect, the server timer automatically pauses and resumes when the first player returns.
    - **Host Display Reconnection:** If the Host Display's browser is refreshed, it will automatically and seamlessly reconnect to the game in progress. This works even if the lobby is empty, making host setup much more robust and preventing the host from getting stuck.
    - **Automatic Host Migration:** If the designated Host player disconnects, control is automatically passed to the next available connected player after a short grace period (~90 seconds), ensuring the game never gets stuck.
    - **Clean Lobby on Restart:** When "Play Again" is selected, any players who were disconnected are automatically removed from the lobby, ensuring the new game starts with only active participants.
    - **Fair Tie-Handling:** If a battle vote results in a tie, points are split evenly. This now also correctly applies if one or both competitors fail to submit an answer in time; the result is a tie, the voting screen is correctly skipped, and points are split fairly. The game reliably advances to the next stage in all auto-win and tie scenarios, preventing any game stalls. The final results screen also correctly awards winner status to all players who tie for first place.
- **Smart Word Bank Balance Guard:** Automatically inspects assigned word banks in 1-on-1, 3-way, and 4-way battles and guarantees a minimum baseline of essential grammatical connectors (`and`, `but`, `because`, `with` / `і`, `але`, `бо`, `щоб`) and linkage words, preventing unbalanced banks in multi-competitor brawls.
- **Instant Question Re-Roll:** Players can swap out one difficult question per round with a single tap. Spare questions are pre-generated up-front in the background, enabling $<10\text{ms}$ instantaneous swaps without network spinners.
- **In-Game Live Emoji Reactions:** Across the lobby, battle voting, battle reveal, and final results screens, players can tap an arcade reaction toolbar (`🔥`, `😂`, `💀`, `👏`, `🤯`, `🌈`) to broadcast floating animated reactions with their character avatar badge to the main Host TV display in real-time.
- **Post-Game Awards Ceremony (Superlatives & Accolades):** The final results screen crowns fun data-driven awards alongside 1st, 2nd, and 3rd place:
    - 🎯 **The Ammo Factory:** Player whose authored words were used in the most winning answers.
    - 🌈 **The Rainbow Alchemist:** Player who combined words from 3+ distinct players the most.
    - 🧹 **The Clean Sweeper:** Player with the most unanimous 100% battle victories.
    - 🪶 **The Minimalist:** Shortest answer that still won a battle.
    - 💬 **The Shakespeare:** Longest winning sentence masterpiece.
- **Adaptive Server Resource & Capacity Safeguards:** Zero-configuration, hardware-agnostic safeguards automatically adapt to any environment (from 512MB free tier containers to multi-core cloud instances):
    - **Dynamic Hardware Autoscaling:** Auto-detects available host memory (`os.totalmem()` / V8 heap limits) and CPU cores (`os.cpus()`) to calculate safe concurrent game thresholds without hardcoded limits.
    - **Real-Time Event Loop Lag Monitoring:** Monitors event loop latency in real time (`perf_hooks.monitorEventLoopDelay`). If CPU saturation or event loop lag exceeds 350ms, temporarily pauses new room creations until lag subsides.
    - **Emergency Memory Sweeps:** Pre-emptively sweeps abandoned rooms when process RSS reaches 85% capacity, shielding the application from container OOM crashes.
    - **Optional Environment Overrides:** `MAX_CONCURRENT_GAMES` and `MAX_MEMORY_THRESHOLD_MB` remain available for administrators who want to enforce strict custom limits.
- **Data-Driven Round & Battle Format Architecture (`formatConfig`):** Decouples round formats (single-line prompt completion, multi-line titles & taglines, role-based matchups) into a structured schema, opening the door for new round types.
- **Responsive Layout for Laptops & TVs:** Host views dynamically adjust column ratios (25% sidebar / 75% content) with compact padding, providing an optimal view on 13–15" laptop screens as well as 4K Smart TVs.
- **Responsive Live Lobby:** Players can rapidly send their avatar from their phone, which animates and flies across the main Host Display. Game settings configured by the host, such as the Color Theme, Silly Mode, and 18+ Mode, are also clearly visible to all players on the main display.
- **Reliable Dependencies:** All external libraries (like `canvas-confetti` and `html2canvas`) are bundled with the application, removing reliance on external CDNs and improving load times and offline availability.

---

## 🎮 How to Play: A Detailed Walkthrough

The game is played over three rounds of increasing stakes, with a final winner crowned at the end.

### 1. Setup & The Lobby
- A "Host Display" is created on a primary screen (like a laptop or TV), which generates a unique **4-digit Game ID** and displays a **QR code**. Scanning this code with a mobile device will take the player directly to the game's page with the Game ID automatically filled in, making it even faster to join.
- **Streamlined Join & In-Room Character Customization:**
  - **Quick Join**: Players only enter the **Game ID** and their **Name** to connect. The server automatically assigns the first available, unused avatar in real-time.
  - **Character Selection Screen**: Upon joining the room, players see their auto-assigned character preview alongside the full 20-avatar grid. Any avatars already chosen by other players currently in the room are clearly **greyed out and disabled**, preventing collisions. Players can choose another available avatar or click **"Confirm Character"** to enter the lobby.
  - **In-Lobby Profile & Name Redaction**: Inside the lobby, players can click the ✏️ icon next to their name to redact or edit their display name in real-time (with automatic duplicate-name validation), or click **"Change Character"** to reselect any open avatar before the host starts the match.
- The first player to join becomes the **Host**. From their device, the Host configures the game options (Color Theme, Game Theme, Silly Mode, 18+ Mode, Slowpoke Mode) and starts the game when ready.

### 2. The Three Rounds of Play

The game consists of **three rounds**. Each round has a **Question Phase** followed by a **Battle Phase**.

#### **Phase 1: Question Answering**
- **Objective:** To provide creative, text-based answers that will become the raw material for the upcoming battles.
- **Gameplay:** Each player receives a unique set of open-ended questions on their screen (e.g., "What's a minor inconvenience that feels like a major tragedy?"). Players type their answers, aiming to be descriptive and funny. The time for this phase scales with the number of questions.
- **Single-Screen Mobile Ergonomics:**
    - **Single-Line Header:** Displays `PROMPT` alongside compact `[Re-Roll (1)]` and `[+30s (1)]` micro-badges that dynamically flip to `(0)` and grey out when exhausted.
    - **Clean Word Counter:** Real-time feedback with `Word count: X (Min 5 words)` and dynamic `VALID` status indicator.
    - **Zero Scrolling:** The entire stage header, prompt card, textarea, and fixed bottom Submit button fit within standard phone viewports (390x844) with zero vertical scrolling.
- **Host TV Arena Display:**
    - **Prominent Theme Marquee:** Displays the chosen game topic in a glowing marquee box at the top center.
    - **Adaptive 3–14 Player Grid:** Dynamically scales across 3 to 14 players to fit laptops (1366x768 / 1440x900) and Smart TVs with zero scrollbars.
    - **Unified Dark Arcade Cards & Live Status:** Shows real-time progress indicators (`✓ READY!`, `✍️ Assembling...`, `💭 Thinking...`, `OFFLINE`) with animated progress bars.

#### **Phase 2: The Battle Phase (Vote -> Reveal -> Next)**
This phase is a rapid, sequential series of events where players vote on one battle at a time.

##### **Step A: Battle Get Ready! (5 seconds)**
- The Host Display and player screens show a "Get Ready for Battle!" message, kicking off the action.

##### **Step B: Answering (Timed)**
- **Gameplay:** A schedule of one-on-one battles is created for the round. On their devices, every player who is competing is presented with all their assigned battle prompts to answer within a single timed phase.
- **The Timer:** The timer for this phase is dynamic. It is calculated to give each player adequate time to answer their **two battles** for the round (e.g., `2 * seconds_per_battle_answer`). This keeps the game pace brisk and fair, regardless of the total number of players.
- **Single-Screen Mobile Layout:**
    - **Natural Prompt Text:** Prompt sentences flow naturally as ordinary text without boxed word borders. Tapping any word in the prompt seamlessly adds it to the player's answer.
    - **Header +30s Micro-Badge:** Positioned in the prompt card header, flipping to `+30s (0)` and disabling upon activation.
    - **Single-Line Tooltip:** Compact green tip (`💡 Tip: Tap prompt words to use them!`) with an instant `[OK]` dismiss button.
    - **Reusable Word Bank:** Word bank tiles remain clickable for multiple usages and don't disappear when added to an answer.
    - **SortableJS Drag-and-Drop:** Drag and drop words within the answer dropzone to reorder them freely, with deletion strictly triggered by clicking the small `✕` icon.
    - **Header Actions:** Word bank header provides instant `[Undo]` and `[Shuffle]` actions.
- **Building an Answer with Syntactic Clause Bundles:**
    - **100% Opponent Words (0% Self-Words):** Players are provided a curated word bank sourced strictly from their opponents' answers and themed fallbacks—a player never receives their own words.
    - **Grammar & Clause Segmentation:** When players submit full sentences in Phase 1, the engine segments them into natural syntactic clauses and grammatical bundles (using conjunctions and punctuation boundaries). Whole bundles are routed together to an opponent so they have matching subjects, verbs, prepositions, and modifiers to construct fluent and hilarious sentences.
    - **Individual Single-Word Tiles:** Every word in the bank is delivered as an individual, clickable single-word tile (no forced multi-word clumps), providing maximum freedom to rearrange, scramble, or weave words together.
- **Interaction:**
    - **Click to Add:** Players **click** single-word tiles from the Word Bank or prompt text to add them to their answer.
    - **Drag and Reorder:** Players can drag and drop the words *within their answer area* to reorder them with smooth SortableJS animations.
    - **Click to Delete:** Each item added to the answer has a small **'x'** icon, making it easy to click and remove it without triggering during drag.

##### **Step C: Sequential Voting & Reveals**
This is a fast-paced cycle that repeats for every battle in the round.
1.  **Vote on One Battle:** The Host Display shows a single battle matchup. All players who are not competing in that specific battle see the anonymous answers on their devices and cast their vote. The view on the player's device is kept in sync, only ever showing the single, active battle. This part is timed.
2.  **Immediate Reveal & Visual Highlights:** As soon as voting for that one battle is complete (either by timer or all votes are in), the results for *that battle only* are shown on the Host Display:
    - **Anonymous Color-Coded Word Highlighting:** Words within revealed answers are dynamically styled with distinct neon color accents (Cyan, Magenta, Emerald, Amber, Slate) corresponding to their anonymous author sources, visually proving the sentence was stitched together from multiple friends without compromising anonymity.
    - **🌈 Rainbow Variety Bonus Badge:** A glowing rainbow badge appears on any answer card that successfully combined words from $\ge 3$ distinct players.
    - **Hands-Free Score Breakdown Micro-Pills:** Compact, high-visibility pills appear beneath the total score reveal (`🗳️ Votes`, `🏆 Win Bonus`, `🧹 Clean Sweep`, `🌈 Rainbow Bonus`), giving couch viewers immediate clarity on how points were earned.
    - **Responsive TV Screen Fitting:** Dynamically scales typography, padding, and avatar sizes across 2-player duos, 3-player trios, and 4-player quads so all cards fit cleanly without vertical scrollbars.
    - **Confetti & Winner Flourish:** The winner is celebrated, points animate smoothly, and voter attribution chips display next to each answer.
3.  **Advance to Next:** After a short reveal, the game automatically moves to the next battle, and the "Vote -> Reveal" cycle begins again.
4.  **Auto-Win Condition:** If only one competitor in a battle submits an answer, they automatically win. The voting phase for that battle is skipped, and the game proceeds directly to a slightly longer result reveal.

This continues until all battles for the round have been voted on and revealed.

### 3. The Final Round: Movie Poster
- The third and final round follows the same flow, but the battle is elevated.
- **Final Battle Prompt:** Instead of a simple fill-in-the-blank, the AI generates a **Movie Genre** and a **Bizarre Premise**.
- **The Task:** The two competing players must use their word banks to create a fitting **Movie Title** and a catchy **Tagline**, turning their opponent's words into a hilarious movie poster concept.

### 4. Game End & Post-Game
- After the final round, the **Final Scores** are displayed on all screens. All players who tie for the highest score are crowned as winners.
- **Battle History:** From the results screen, players can tap "View Battle History" to see a full log of every battle. Each battle can be saved as an image to their device.
- **Play Again:** The **Host Player's device** will show a "Play Again" button. Tapping this instantly resets the game and takes all players (including the Host Display) back to the lobby. Any players who were disconnected at the end of the game are removed, ensuring a clean start for the new match.

---

## 🛠️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd word-scramble-party-game
    ```

2.  **Prerequisites:**
    - Make sure you have **Node.js** (version 18 or newer) and **npm** installed.
    - You can download them from [https://nodejs.org/](https://nodejs.org/).

3.  **Set up Environment Variables:**
    - Create a `.env` file in the project root (see `.env.example` for reference).
    - Add your Google Gemini API key:
      ```env
      GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
      # or API_KEY="YOUR_GEMINI_API_KEY"
      PORT=3000
      ```
    - The server uses `gemini-3.7-flash` with graceful fallback to built-in content packs if an API key is not provided or if requests fail.

4.  **Install Dependencies:**
    - The first time you set up the project, or after pulling new changes, run:
    ```bash
    npm install
    ```

5.  **Run the Application:**

    ### For macOS Users (Recommended):
    A convenient script is provided to handle all steps for you.
    1.  Make the script executable (you only need to do this once):
        ```bash
        chmod +x ./start-macos.sh
        ```
    2.  Run the script:
        ```bash
        ./start-macos.sh
        ```
        This script will automatically check for prerequisites, install dependencies, and start the game server.

    ### For All Other Systems (Manual Steps):
    Run the development server using the following command:
    ```bash
    npm run start:dev
    ```
    This command concurrently starts the Node.js server and the Vite frontend dev server. The `start:dev` script uses `concurrently` with a `--kill-others` (`-k`) flag. This ensures that if either the frontend or backend process fails, the other is automatically terminated. This prevents `ECONNREFUSED` proxy errors during development where the UI might load before the server is ready.

6.  **Connect and Play:**
    - **Cloud / AI Studio Public Link:** When running in AI Studio or deployed to Cloud Run, share your app's public URL (or use the built-in **"📋 Copy Game Link"** button / QR code on the Host screen). Players on any network or mobile phone can join instantly.
    - **Local Network Play:** When running locally on your laptop, the Host screen displays your LAN IP (e.g., `http://192.168.1.10:3000`). Devices on the same Wi-Fi can scan the QR code or enter the 4-letter Room ID.

---

## 🌐 AI Studio & Cloud Run Publishing
This application is fully compatible with Google AI Studio's built-in hosting and Cloud Run deployment:
- **Single Port Architecture (`PORT 3000`):** Express serves both the static Svelte frontend and the Socket.IO WebSocket endpoints through a unified origin.
- **Dynamic Origin Detection:** The Host display automatically detects public web URLs (`*.run.app` / custom domains) and creates universally scannable QR codes and shareable room links with automatic `?gameId=XXXX` routing.
- **Server-Side Gemini Integration:** AI operations run securely server-side without exposing API keys to player browsers.

---

## 💻 Technical Architecture & Algorithms

### Client-Server Model
- **Server (Node.js/Express):** The authoritative source of truth. It manages all game state, handles game logic (scoring, phase transitions), communicates with the Gemini API, and uses **Socket.io** for real-time, event-based communication.
- **Client (Svelte):** A reactive Svelte frontend that renders the UI based on state received from the server.
  - **Component-Based Architecture:** The UI is broken down into small, reusable components. For example, the `PlayerGameView` is a simple router that renders phase-specific child components (e.g., `PlayerQuestionView`, `PlayerBattleAnsweringView`), making the codebase highly modular and maintainable.
  - **Centralized State Management:** A central Svelte store (`src/stores.js`) manages the `gameState` and the socket connection on the client-side.

### Modular Server Handler Architecture
- **Domain-Specific Modules (`game/handlers/`):** The Socket.IO communication layer is split into specialized sub-modules:
  - `validation.js`: Higher-order schema validation wrapper capturing socket and IO server contexts safely.
  - `lobbyHandlers.js`: Game creation, joining, configuration (themes, 18+ mode, silly mode, slowpoke mode), and lobby emoji reactions.
  - `connectionHandlers.js`: Disconnection recovery, session reconnection, host reassignment timers, and room lifecycle teardowns.
  - `gameplayHandlers.js`: Idempotent question answers, incremental draft synchronizations, battle response submissions, and live voting.
  - `game/handlers.js`: Clean single registration hub connecting event listeners to validated domain handlers.

### Audio & Sound Architecture
- **Web Audio API SoundEngine (`src/lib/utils.js`):** Audio playback is powered by a Web Audio API `AudioContext` and in-memory pre-decoded `AudioBuffer` pool.
  - **Zero-Latency Concurrent Playback:** Multiple audio events (e.g. countdown ticks, voting cues, score fanfares) trigger simultaneously without clipping, audio stutter, or mobile latency.
  - **Dynamic Countdown Pitch Escalation:** During the final 5 seconds of time-critical phases, timer ticks (`sfx_timer_tick`) dynamically scale pitch from 1.0x to 1.3x for arcade tension.
  - **Auto Audio Pre-Warming:** Gesture-activated audio unlocking (`unlockAudio()`) primes audio buffers on the first tap/click across mobile browsers (Safari iOS and Chrome Mobile).
  - **Graceful DOM Fallback:** Transparently falls back to HTML5 `<audio>` elements if Web Audio API is unsupported.

### Full-Stack Performance & Reliability
- **HTTP Compression & Immutable Caching (`server.js`):**
  - Gzip/Deflate compression enabled for all static assets and HTTP endpoints.
  - Content-hashed static JS/CSS chunks (`dist/assets/`) are cached with `Cache-Control: max-age=31536000, immutable`, while `index.html` uses `no-cache, must-revalidate` for instant zero-downtime client updates.
- **WebSocket Transport Optimization:** Direct WebSocket connections (`transports: ['websocket', 'polling']`) eliminate initial long-polling handshake overhead, while `perMessageDeflate: false` removes CPU compression overhead on high-frequency small packets (e.g. 20-byte `timer-tick` broadcasts and reaction bursts).
- **GPU, Page Visibility & Battery Throttling:**
  - **Background Tab Freezing (`src/App.svelte` / `src/app.css`):** Listens to `visibilitychange` (`data-app-hidden="true"`) to automatically pause 60 FPS 3D canvas grid animations and CSS keyframes when the phone is locked or browser tab is hidden.
  - **Emoji Sprite Pool:** Floating reactions are capped at 20 concurrent elements on screen to prevent DOM bloat during party reaction bursts.
  - **Async Image Decoding:** Character avatars in `PixelAvatar.svelte` use `loading="lazy"` and `decoding="async"` with explicit dimensions to prevent main-thread UI layout jank.
- **Persistent AI Connection Pooling (`geminiService.js`):** Persistent HTTP Keep-Alive sockets eliminate TCP/TLS handshake latency (~100–250ms saved per prompt) across background round pre-fetches.
- **Automated Memory Lifecycle & Garbage Collection (`game/manager.js`):** Periodic 30-minute background sweep automatically prunes abandoned rooms older than 2 hours with no active socket connections, releasing memory and timers.
- **High-Performance Word Bank Engine (`wordBankEngine.js`):** Sub-millisecond in-process generation (<2ms) with resilient Node.js `Worker` thread fallback.
- **Dynamic Code-Splitting & Reactivity:** Lazy-loaded `html2canvas`, Rollup manual vendor chunking (shrinking initial client JS from 508 kB to 195 kB), and 200ms debounced Phase 1 draft syncs.
- **Lightweight Timer Tick Broadcasting:** Server phase timers broadcast lightweight countdown ticks (`timer-tick`) across the 1-second interval, avoiding deep game state serialization on non-state-changing seconds.
- **CSS Paint & Layout Containment:** CSS `contain: layout style;` is applied to active answer dropzones, word bank grids, and arcade panels, isolating browser style calculations and layout reflows.

### Sequential Battle & Voting State Machine
- The game flow is managed by a phase-based state machine on the server. The battle phase is now a loop: `battle_voting` -> `battle_result_reveal`. The server advances an index (`currentVotingBattleIndex`) and transitions between these two phases until all battles are complete, at which point it moves to the next round. This creates the sequential "vote-reveal-next" experience.

### AI Integration & Resilient Fallback System
- **Gemini API (`geminiService.js`):** Encapsulates communication with the Google Gemini API using the modern `@google/genai` SDK.
- **Multi-Model Fallback Chain:** To protect against temporary API traffic spikes or regional 503 "High Demand" errors, requests automatically cascade across a resilient model fallback chain (`gemini-3.7-flash` → `gemini-flash-latest` → `gemini-3.1-flash-lite`).
- **Exponential Backoff & Jitter:** Transient errors (503 Service Unavailable, 429 Resource Exhausted, 500) trigger intelligent backoff retries before switching candidate models.
- **Language-Dedicated Prompt Architecture (`prompts/en/` & `prompts/ua/`):**
  - Dedicated prompt files per language (`prompts/en/` and `prompts/ua/`, with backward-compatible `uk` alias support) eliminate cross-language instruction bleed and prime the AI with native cultural and comedic archetypes.
  - **Ukrainian Grammar & Case Safeguards:** Strictly enforces open situational colon-terminated prompt setups (`Слоган на білборді:`, `Попереджувальний напис на дверях:`, `1-зірковий відгук відвідувача:`) and bans case-governing prepositions (`для ____`, `проти ____`, `через ____`), eliminating grammatical mismatches when players assemble scrambled word tiles.
  - **Expanded Universal Connectors (`ESSENTIAL_CONNECTORS`):** Generates guaranteed case-independent "linguistic glue" for Ukrainian (`і`, `та`, `але`, `бо`, `щоб`, `дуже`, `завжди`, `ніколи`, `просто`, `раптом`, `навіть`, `це`, `було`, `треба`, `можна`, `ось`, `тільки`) and English (`and`, `but`, `because`, `with`, `just`, `even`, `if`, etc.).
  - **Typographic Apostrophe Tokenization:** Full regex tokenization support for ASCII `'`, Unicode curly `’`, and official Ukrainian typographic modifier apostrophe `ʼ` (U+02BC, e.g. `мʼясо`, `звʼязок`, `імʼя`).
- **Zero-Stall Fallback Packs:** If all AI models are unreachable or the error threshold is reached, the server seamlessly falls back to rich, human-authored bilingual content packs (`game/fallback/`), guaranteeing smooth gameplay without game interruptions.

### Smart TV & Low Power Display Optimization
- **Auto-Detection (`isSmartTV`):** Detects Smart TV browsers via User-Agent signatures (LG webOS, Samsung Tizen, Android TV, Google TV, Apple TV, Fire TV sticks, Roku, Hisense, etc.) and `@media (display-mode: tv)`.
- **Manual Host Switch:** Hosts can toggle **"📺 TV / Low Power Mode"** ON/OFF at any time directly from the Main Menu or Host Lobby, persisting preference to `localStorage`.
- **Targeted Performance Enhancements (Active in TV Mode):**
  - **Static Background:** Freezes the 60 FPS full-screen 3D synthwave canvas grid to reduce GPU compositing overhead.
  - **Zero-Glow Shader Mode:** Eliminates heavy multi-layer box shadows and dynamic text glows, rendering high-contrast, crisp retro borders.
  - **Confetti & Particle Throttling:** Caps particle quantities during score and winner reveals.
  - **Paint & Layout Containment:** Uses CSS `contain: layout paint;` on the host dashboard containers to prevent layout thrashing on high-resolution 4K TV screens.

### Word Bank Generation Algorithm
The game features two distinct algorithms for generating word banks, which can be selected via a configuration flag. This is the core mechanic that makes the battles unique and personal.

**Common Steps for Both Algorithms:**
1.  **Source Material Collection:** The server gathers all text answers submitted by players from the *current* and all *previous* rounds.
2.  **Intelligent Chunking:** To preserve context, answers are first split into thematic **"word chunks."**
3.  **Fair Distribution & Allocation:** The algorithm distributes these chunks to players for their battles, ensuring **players never receive chunks from their own answers**. This forces them to engage with their opponents' ideas.
4.  **Word Pool Splitting:** To ensure variety in every battle, a player's total allotted word chunks for the round are split evenly between their battles.
5.  **Word Bank Assembly & Supplementing:** The collected chunks are then tokenized into individual words. If a bank has fewer than the configured minimum number of words, it is supplemented with fallback words. The final bank size is capped at the configured maximum.

**Algorithm Selection:**
- **`Current` Algorithm:** This is the original logic. It shuffles current-round and past-round chunks separately, but then **mixes them together** into a single large pool before distributing them to players. This results in a highly randomized bank with a good mix of old and new content.
- **`Prioritized` Algorithm (New Default):** This refined logic first distributes **all chunks from the current round**. Only after the freshest content has been given out does it begin distributing chunks from past rounds to top up the player pools. This ensures the most recent and relevant answers are more likely to appear in the word banks.

### Scoring System (`calculateBattlePoints`)
- **Scaled 3-Round Economy:** Scoring escalates across the three rounds to reward progression:
  - **Points Per Vote:** 300 pts (Round 1) → 600 pts (Round 2) → 1,200 pts (Round 3 / Finale).
  - **Victory Bonus:** +200 pts (R1) → +400 pts (R2) → +800 pts (R3) awarded to the competitor with the most votes.
  - **Clean Sweep Bonus:** +150 pts (R1) → +300 pts (R2) → +600 pts (R3) awarded for winning 100% of the cast votes.
  - **Flat Word Royalties:** When another player uses words you wrote in an answer that earns votes, you receive a flat royalty (+50 in R1, +75 in R2, +100 in R3) per answer. This rewards creative word crafting without runaway scoring.
  - **Rainbow Variety Bonus:** +100 pts (R1) → +200 pts (R2) → +400 pts (R3) awarded to competitors who craft an answer uniting words from 3 or more distinct player authors.
- **Auto-Win:** If one competitor fails to provide an answer in time, the other player receives the full victory and sweep bonus.
- **Ties:** If votes are evenly split, the victory bonus is divided equally between the competitors.

---

## ⚙️ Configuration (`src/lib/config.js`)

- **`MIN_PLAYERS`, `MAX_PLAYERS`**: Player count limits (3 to 14 players).
- **`POINTS_PER_VOTE`, `VICTORY_BONUS_PER_ROUND`, `CLEAN_SWEEP_BONUS_PER_ROUND`, `FLAT_ROYALTY_PER_ROUND`, `RAINBOW_BONUS_PER_ROUND`**: Configurable scaled scoring matrix per round.
- **`USE_PRIORITIZED_WORD_BANK_ALGO`**: A boolean (`true`/`false`) to select the word bank algorithm. `true` uses the new, prioritized algorithm; `false` uses the current one.
- **`WORD_BANK_SIZES`**: A new object that defines tiered minimum and maximum word bank sizes for each of the three game rounds, allowing for a better sense of progression as the game continues.
- **`SOUNDS_ON_HOST_ONLY`**: A boolean (`true`/`false`) to control where sounds are played. If `true`, all sounds (including timer ticks) will only play on the Host Display. Defaults to `false` to play on all devices.
- **Timers:** All phase timings are defined for both normal and "Slowpoke" modes. This includes fixed timers for transitions and voting, and per-item timers for the Question phase (based on number of questions) and Battle Answering phase (based on number of battles).
- **`PLAYER_RECONNECTION_TIMEOUT`**: The grace period for players to rejoin (in milliseconds).
- **`AVATARS`**: The full list of available emoji characters for avatars.
- **`AVATAR_MAP`**: A map linking emoji characters to their corresponding image file names (e.g., `'🐸': 'frog'`).

## 🧪 UI Component Dev Harness & Testing

### 🎨 Instant UI Dev Harness (`?debug=1`)
For rapid front-end iteration with Vite Hot Module Replacement (HMR) without needing a full multi-player game setup:
- **Direct Harness URL:** `http://localhost:3000/?debug=1`
- **Direct Screen Previews:**
  - `http://localhost:3000/?debug=player_battle_single` (Single-line word scramble battle)
  - `http://localhost:3000/?debug=player_battle_movie` (Final round 2-part movie poster battle)
  - `http://localhost:3000/?debug=player_voting` (3-way brawl mobile voting)
  - `http://localhost:3000/?debug=host_voting` (Host TV 3-way brawl screen with live vote bars)
  - `http://localhost:3000/?debug=host_podium` (Host TV winner podium & confetti)
  - `http://localhost:3000/?debug=avatar_gallery` (All 14 pixel avatars in multiple sizes)
- **Features:** Floating dev toolbar, device frame presets (Mobile 375px, Tablet 768px, TV 1920px), tile quantity slider (10–60 tiles), EN/UA language toggle, theme switcher, and instant confetti trigger.

---

## 🧪 Testing

The codebase includes comprehensive test suites spanning fast unit/logic tests with **Vitest** and full multi-client browser End-to-End (E2E) UI tests with **Playwright**.

### 1. Unit & Logic Tests (Vitest)
Fast backend tests verifying game algorithms, scheduling, validation schemas, and state sanitization:

- **Run all unit tests:**
  ```bash
  npm test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

#### Unit Test Coverage Areas:
1. **Helper Utilities (`test/helpers.test.js`):** In-place Fisher-Yates array shuffling, alphanumeric game ID generation, cryptographic token generation, and secure client-facing state sanitization (stripping secret player tokens).
2. **Schema Validation (`test/validation.test.js`):** Zod schema boundary tests for player registration, avatar selection, answer length constraints, voting, and theme selection.
3. **Battle Scheduling & Pairings (`test/battleSchedule.test.js`):** Group size distributions (2-player duos vs 3-player trios), opponent non-repetition, 11-player rotation matrix, and fairness guarantees across 3 to 14 players.
4. **Round Pre-fetching (`test/roundPrefetch.test.js`):** Asynchronous background data pre-fetching during active rounds to eliminate transition lag.
5. **Fallback Content (`test/fallbackContent.test.js`):** Bilingual fallback packs, theme non-repetition, and prompt structure verification.
6. **Game State Manager (`test/manager.test.js`):** Room lifecycle, game instance registration, retrieval, and deletion.
7. **Scoring Algorithms & Bonuses (`test/scoringBonuses.test.js`):** Flat Word Royalties awarded to contributing authors, Rainbow Bonus (3+ distinct author word combinations), 4-player 2-0 clean sweeps, 1-1 split ties with victory bonus splitting, and auto-win 2-vote equivalent scoring.
8. **Disconnection & Reconnection Resiliency (`test/reconnection.test.js`):** Player token reconnection, partial answer recovery cache, host display socket reattachment, host reassignment timers upon host disconnect, and automatic game timer pausing when all players disconnect.
9. **Multi-Round Cumulative Scoring & Preservation (`test/cumulativeScoreTracking.test.js`):** Multi-round point accumulation, cross-round score persistence from Round 1 through Round 3, word royalty attribution to non-competing authors, and final podium sorted rankings without data loss.
10. **Multi-Competitor Brawls & 11-Player Hybrid Fairness Matrix (`test/multiCompetitorAnd11PlayerBattles.test.js`):** 3-way brawls (1 vs 1 vs 1) and 4-competitor matchups (Answer A vs B vs C vs D), multi-competitor clean sweeps, 2-way and 3-way victory bonus splits, and the 11-player hybrid matrix (6 trios + 2 duos) with strict 2-battle participation, opponent uniqueness, and round-by-round duo rotation.
11. **Word Bank Engine & Smart Balance Guard (`test/wordBankEngine.test.js`):** Sub-millisecond word bank assembly, 0% self-authored words guarantee, and connector guard ensuring $\ge 4$ essential connectors in English and Ukrainian.
12. **Superlatives, FormatConfig & Question Re-Roll (`test/superlativesAndRoundMechanics.test.js`):** End-game accolades (Ammo Factory, Rainbow Alchemist, Clean Sweeper, Minimalist, Shakespeare), data-driven `formatConfig` schema, and reserve question re-roll mechanics.
13. **Multi-Game Concurrency & Session Isolation (`test/multiGameIsolation.test.js`):** Simultaneous independent game rooms, collision-proof 4-letter room ID generation, isolated phase transitions, and $O(1)$ socket lookup performance.

---

### 2. Multi-Client End-to-End (E2E) UI Tests (Playwright)
End-to-End browser tests simulating real multiplayer game sessions with **1 Desktop Host Display + 3-4 Mobile Phone Controllers** running concurrently:

- **Run all E2E tests (headless):**
  ```bash
  npm run test:e2e
  ```
- **Run E2E tests with interactive visual UI:**
  ```bash
  npm run test:e2e:ui
  ```
- **Run E2E tests with visible browser windows:**
  ```bash
  npm run test:e2e:headed
  ```

#### E2E Test Coverage Areas:
1. **Lobby & Settings Synchronization (`e2e/lobby.spec.js`):**
   - Host display creation and 4-letter Game ID extraction.
   - Concurrent 3-player mobile join flow (name entry, avatar selection).
   - Real-time player counter and avatar list synchronization across all devices.
   - Avatar collision prevention (taken avatars rejected and dynamically disabled).
   - Real-time theme selection and floating reaction emoji broadcasts.
2. **Full Multi-Player Game Flow (`e2e/gameFlow.spec.js`):**
   - Complete lifecycle from Lobby → Phase 1 Question Answering → Phase 2 Word Scramble Battle → Phase 3 Sequential Voting & Scoring.
   - Question textarea input, word count validation, and multi-question submission across all 3 players.
   - Dynamic clause bundle parsing and word bank tile generation.
   - Word bank tile clicking and scramble answer submission.
   - Real-time sequential voting across all matchups, host reveal, and scoreboard progression.
3. **11-Player Hybrid (1 vs 1 and 1 vs 1 vs 1) Game Flow (`e2e/elevenPlayerGameFlow.spec.js`):**
   - 11-player full game flow (1 Host + 11 Mobile devices: Alice, Bob, Charlie, Dave, Eve, Frank, Grace, Heidi, Ivan, Judy, Kevin).
   - 8 battles scheduled per round: exactly 6 Trios (1 vs 1 vs 1) and 2 Duos (1 vs 1), validating 22 player slots (2 battles per player).
   - Multi-voter tallying across both trio brawls and duo showdowns with round-by-round duo rotation.
4. **14-Player Maximum Scale Game Flow (`e2e/fourteenPlayerGameFlow.spec.js`):**
   - Maximum lobby capacity testing (1 Host + 14 Mobile devices: Alice, Bob, Charlie, Dave, Eve, Frank, Grace, Heidi, Ivan, Judy, Kevin, Leo, Mia, Noah).
   - 10 battles scheduled per round: 8 Trios (1 vs 1 vs 1) and 2 Duos (1 vs 1), validating 28 player slots (2 battles per player).
   - Simultaneous question answering for 14 clients, word scramble answering, and multi-voter tallying with 11-12 voters per battle.
5. **Browser Reload & Reconnection Resiliency (`e2e/reconnection.spec.js`):**
   - Mid-game mobile player browser reload / refresh: verifies instant auto-reconnection via localStorage session tokens without losing the active question phase or answers.
   - Host Display browser reload / refresh: verifies instant auto-reconnection as Host Display, re-rendering active timers and all player lists without disrupting connected clients.
6. **Full 3-Round Lifecycle, Movie Dialogue Finale & Winner Podium (`e2e/finalRoundAndVoting.spec.js`):**
   - Full progression across all 3 rounds of the game.
   - Sequential battle voting across every matchup in each round.
   - Round 3 Finale format: Movie Genre & Premise, Movie Title builder, and Movie Tagline builder with workspace switching.
   - Final movie battle voting with Title + Tagline dialogue comparison.
   - Game Over screen, winner celebration podium, and "Play Again" button validation.

---

## 🏷️ Version History & Checkpoints

- **`v1.5.0` (Latest Release - UI/UX Polish, Accolades & Smart Mechanics)**:
  - **Smart Word Bank Balance Guard (`wordBankEngine.js`):** Automatically injects guaranteed linguistic connectors (`and`, `but`, `because`, `with` / `і`, `але`, `бо`, `щоб`) into 1-on-1, 3-way, and 4-way word banks if harvested player chunks lack linkage words, preventing all-noun deadlock in large brawls.
  - **Instant Question Re-Roll System:** Pre-generates spare question pools during round generation, allowing players to swap out 1 question per round with $<10\text{ms}$ latency and instant local state reset.
  - **Smart "Undo" & Word Bank Shuffle:** Adds a dedicated action history stack to the mobile workspace for accurate word pops regardless of drag-and-drop movements, alongside an instant word bank shuffle button.
  - **In-Voting Live Emoji Reactions:** Allows voters and spectators to send live floating reactions (`🔥`, `😂`, `💀`, `👏`, `🤯`, `🌈`) directly to the Host TV screen while waiting for other votes to complete.
  - **"Votes Locked In" Live Ticker:** Host display renders an active voter progress bar (`🗳️ X/Y Votes Locked In`) with individual voter avatar checkmarks during voting without compromising secret voting.
  - **Post-Game Awards Ceremony (Superlatives & Accolades):** Algorithmic awards for **The Ammo Factory**, **The Rainbow Alchemist**, **The Clean Sweeper**, **The Minimalist**, and **The Shakespeare** displayed on both TV podium and mobile controller results.
  - **Data-Driven Battle Format Architecture (`formatConfig`):** Encapsulates single-line, multi-line, and future role-based round types into a unified schema across backend and frontend.
- **`v1.4.0` (Performance & Optimization)**:
  - **Dynamic Code-Splitting & Lazy Loading:** Lazy-loads `html2canvas` on demand and splits vendor dependencies (`socket.io-client`, `sortablejs`, `canvas-confetti`, `qrcode-generator`), reducing the initial application bundle from 508 kB down to 195 kB (~60% decrease).
  - **Instant Word Bank Engine (`wordBankEngine.js`):** Sub-millisecond in-process word bank synthesis (<2ms) with resilient worker thread fallback, eliminating round transition stutter.
  - **Debounced Phase 1 Typing Synchronization:** 200ms debounce on draft syncing cuts network packet volume by 90% during simultaneous 14-player typing while keeping local input 100% responsive.
  - **Lightweight Timer Tick Broadcasting (`timer-tick`):** Avoids serializing massive cumulative game state objects on 1-second interval ticks.
  - **CSS Layout Containment:** Applied `contain: layout style;` to active panels and word bank containers to prevent browser reflows during tile manipulation.
- **`v1.3.0`**:
  - **Prompt Engine Versioning & Feature Flag (`PROMPT_VERSION`):** Configurable via Render.com environment variable (`v2` vs `v1`).
  - **`v2` Situational Battle Prompts & Ukrainian Grammar Safeguards:** Streamlined prompt engine designed specifically for casual party play and limited word banks (30–50 words). Uses fast reaction micro-scenarios in Phase 1, open colon-terminated situational prompts (slogans, rules, warnings, reviews, bad excuses) in Phase 2, strictly bans case-governing prepositions in Ukrainian, and enriches fallback words with essential connectors.
  - **`v1` Classic Engine Preservation:** Full backward compatibility preserved under `prompts/v1/`.
- **`v1.2.0`**:
  - **14-Player Scale, 3-Way & 4-Way Brawls:** Expanded lobby capacity to 14 players. For 10+ player lobbies, battles automatically partition into high-energy 4-player quads (**"🔥 4-Way Brawl"**) and 3-player trios (**"💥 3-Way Brawl"**), reducing total voting rounds to just 5-7 battles.
  - **Balanced Hybrid Pairing Matrix:** 11 and 13-player matches partition into quads and trios with round-by-round rotation, guaranteeing 2 battles per player with unique opponents and zero duos.
  - **TV Display & Controller Presentation Badging:** Battles are dynamically badged as **"⚡ 1-on-1 Showdown"**, **"💥 3-Way Brawl"**, or **"🔥 4-Way Brawl"** with responsive 2, 3, and 4-card layouts.
- **`v1.1.0`**:
  - **Interactive Prompt Tiles:** Battle prompts, movie genres, and scenario premises are broken into interactive clickable tiles, allowing instant integration into answers without cluttering the bottom bank.
  - **Multi-Use Word Engine:** Words from both the prompt and word bank can be selected multiple times to craft repeated words and rhythm.
  - **Clear Workspace Actions:** Added quick one-tap clear buttons to reset active answer lines.
  - **Token Authorship & Word Royalties:** Word chunks preserve author metadata, distributing flat royalties to word creators when their words win votes in other players' answers.
  - **Scaled 3-Round Scoring Matrix:** Implemented per-vote point scaling, victory bonuses, clean sweep bonuses, and rainbow variety bonuses.
  - **Structured Scenario Prompting:** 3 distinct comedic archetypes in `themes.txt`, rich 5-10 word descriptive question harvesting, and punchy 1-2 sentence movie showdown premises.
- **`v1.0.0` (Baseline Tag: `v1.0.0`)**:
  - Stable 3-round word scramble party game with Gemini topic & question generation, fallback content pack, mobile player controls, and winner-take-all battle scoring.
  - Checkpoint created to allow instant rollback via `git checkout v1.0.0` at any time.
