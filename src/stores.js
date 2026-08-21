import { writable, get, derived } from 'svelte/store';
import { io } from 'socket.io-client';
import { playSound } from './lib/utils.js';
import { UI_TEXT } from './ui_text.js';

// --- Individual, Granular Stores for Better Performance ---
export const view = writable('language'); // 'language', 'mainMenu', 'joinPrompt', 'hostDisplay', 'playerGame', 'instructions'
export const language = writable(localStorage.getItem('wordScrambleLang') || 'en');
export const gameState = writable(null);
export const currentPlayer = writable(null);
export const error = writable({ message: null, fatal: false, context: null });
export const isLoading = writable(false);
export const isHostDisplay = writable(false);
export const joinForm = writable({ gameId: '', playerName: '', avatar: '' });
export const showBattleHistory = writable(false);
export const flyingEmojis = writable([]);
export const activeTimeBoostNotice = writable(null);

// --- Smart TV & Low Power Display Store ---
function detectInitialTvMode() {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('wordScrambleTvMode');
    if (stored !== null) return stored === 'true';
    if (typeof navigator !== 'undefined') {
        return /smart-tv|smarttv|googletv|appletv|hbbtv|netcast|webos|tizen|viera|bravia|hisense|aftt|aftm|firetv|roku/i.test(navigator.userAgent);
    }
    return false;
}

export const tvMode = writable(detectInitialTvMode());

// Sync data-tv-mode attribute and localStorage whenever tvMode changes
if (typeof window !== 'undefined') {
    tvMode.subscribe((value) => {
        try {
            localStorage.setItem('wordScrambleTvMode', value ? 'true' : 'false');
            if (value) {
                document.body.setAttribute('data-tv-mode', 'true');
            } else {
                document.body.removeAttribute('data-tv-mode');
            }
        } catch (e) {
            console.warn('Could not persist tvMode:', e);
        }
    });
}

export function toggleTvMode() {
    tvMode.update(val => !val);
}

// --- Base Derived Stores ---
export const t = derived(language, $language => {
    const lang = ($language === 'ua' || $language === 'uk') ? 'uk' : 'en';
    return UI_TEXT[lang] || UI_TEXT.en;
});

// --- Performance-Optimized Derived Stores ---
export const gamePhase = derived(gameState, $g => $g?.phase);
export const gamePlayers = derived(gameState, $g => $g?.players || []);
export const phaseTimer = derived(gameState, $g => $g?.phaseTimer);
export const currentRound = derived(gameState, $g => $g?.currentRound);

// Details for the currently logged-in player
export const currentPlayerDetails = derived(
  [gamePlayers, currentPlayer],
  ([$gamePlayers, $currentPlayer]) => {
    if (!$gamePlayers || !$currentPlayer) return null;
    return $gamePlayers.find(p => p.id === $currentPlayer.id);
  }
);

// The questions assigned to the current player for this round
export const myPlayerQuestions = derived(
  [gameState, currentPlayer],
  ([$g, $cp]) => {
    if (!$g || !$cp || !$g.playerAnswers) return [];
    return $g.playerAnswers[$cp.id]?.questions || [];
  }
);

// The battles the current player has to answer in this phase
export const myBattlesToAnswer = derived(
    [gameState, currentPlayer],
    ([$g, $cp]) => {
        if ($g?.phase !== 'battle_answering' || !$g.battleSchedule || !$cp) {
            return [];
        }
        return $g.battleSchedule.filter(b => b.competitors.includes($cp.id) && !b.answers[$cp.id]);
    }
);

// The current battle being voted on
export const currentVotingBattle = derived(
    gameState,
    ($g) => {
        if (!$g || !$g.battleSchedule || $g.currentVotingBattleIndex === undefined) return null;
        return $g.battleSchedule[$g.currentVotingBattleIndex];
    }
);


// --- Store-related variables ---
let socket;
let lastTickSecond = -1; // Persists across game state updates to track ticking for sounds
let partialAnswers = {}; // Client-side cache for partial answers
const initialErrorState = { message: null, fatal: false, context: null };

// --- Actions and Socket Logic ---

export function initializeSocket() {
    if (socket) return;
    socket = io({
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    socket.on('connect', () => {
        console.log('Connected to server!');
        const playerSession = JSON.parse(localStorage.getItem('wordScrambleSession'));
        const hostSession = JSON.parse(localStorage.getItem('wordScrambleHostSession'));

        if (playerSession?.playerId && playerSession?.playerToken && playerSession?.gameId) {
            console.log("Found player session, attempting to reconnect...");
            isLoading.set(true);
            error.set({ ...initialErrorState });
            clearConsumedPartialAnswers(); // Clear any stale answers before reconnecting
            socket.emit('reconnect-player', playerSession);
        } else if (hostSession?.gameId) {
            console.log("Found host session, attempting to reconnect host display...");
            isLoading.set(true);
            error.set({ ...initialErrorState });
            socket.emit('join-as-host-display', { gameId: hostSession.gameId });
        } else {
             isLoading.set(false);
             error.set({ ...initialErrorState });
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server.');
        isLoading.set(true);
        error.set({ message: get(t).reconnecting, fatal: false, context: null });
    });

    socket.on('game-state-update', (newGameState) => {
        const currentStorePlayer = get(currentPlayer);

        let updatedPlayer = currentStorePlayer;
        if (updatedPlayer) {
            const playerInGame = newGameState.players.find(p => p.id === updatedPlayer.id);
            if (!playerInGame && newGameState.phase !== 'lobby') {
                 console.log("Player not found in new game state. Resetting.");
                 resetToMenu();
                 error.set({ message: get(t).reconnectFailed, fatal: true, context: null });
                 return;
            }
            if (playerInGame) {
                updatedPlayer.isHost = playerInGame.isHost;
            }
        }
        
        isLoading.set(false);
        error.set({ ...initialErrorState });
        gameState.set(newGameState);
        currentPlayer.set(updatedPlayer);

        // Synchronize client UI language with the room's language
        if (newGameState.language) {
            const normalizedRoomLang = (newGameState.language === 'ua' || newGameState.language === 'uk') ? 'uk' : 'en';
            const currentLang = get(language);
            const normalizedCurrentLang = (currentLang === 'ua' || currentLang === 'uk') ? 'uk' : 'en';
            if (normalizedRoomLang !== normalizedCurrentLang) {
                language.set(normalizedRoomLang);
                try {
                    localStorage.setItem('wordScrambleLang', normalizedRoomLang);
                } catch (e) {}
            }
        }

        // If the player is viewing instructions and the host starts the game,
        // automatically close the instructions and show the game.
        if (get(view) === 'instructions' && newGameState.phase !== 'lobby') {
            view.set('playerGame');
        }

        // If the game phase is no longer 'results', hide the battle history
        if (newGameState.phase !== 'results') {
            showBattleHistory.set(false);
        }
        
        const remaining = newGameState.phaseTimer;
        const _isHostDisplay = get(isHostDisplay);
        const timerPhasesForTick = ['question', 'battle_answering', 'battle_voting'];

        if (timerPhasesForTick.includes(newGameState.phase) && remaining <= 10 && remaining > 0) {
            if (remaining !== lastTickSecond) {
                if (!newGameState.soundsOnHostOnly || _isHostDisplay) {
                    const pitch = remaining <= 5 ? (1.0 + (5 - remaining) * 0.06) : 1.0;
                    playSound('sfx_timer_tick', { pitch });
                }
                lastTickSecond = remaining;
            }
        } else {
            lastTickSecond = -1;
        }
    });

    socket.on('timer-tick', ({ phaseTimer: remaining, phase }) => {
        gameState.update(g => {
            if (!g || g.phase !== phase) return g;
            return { ...g, phaseTimer: remaining };
        });

        const currentGameState = get(gameState);
        const _isHostDisplay = get(isHostDisplay);
        const timerPhasesForTick = ['question', 'battle_answering', 'battle_voting'];

        if (timerPhasesForTick.includes(phase) && remaining <= 10 && remaining > 0) {
            if (remaining !== lastTickSecond) {
                if (!currentGameState?.soundsOnHostOnly || _isHostDisplay) {
                    const pitch = remaining <= 5 ? (1.0 + (5 - remaining) * 0.06) : 1.0;
                    playSound('sfx_timer_tick', { pitch });
                }
                lastTickSecond = remaining;
            }
        } else {
            lastTickSecond = -1;
        }
    });
    
    socket.on('game-created', ({ gameId }) => {
        const hostSession = { gameId };
        localStorage.setItem('wordScrambleHostSession', JSON.stringify(hostSession));
        
        isLoading.set(false);
        error.set({ ...initialErrorState });
        view.set('hostDisplay');
        isHostDisplay.set(true);
        playMusic('lobby');
        gameState.set({ 
            id: gameId,
            phase: 'lobby',
            players: [],
            preGeneratedThemes: { en:[], uk:[] },
            connectURL: '...'
        });
    });

    socket.on('player-joined', ({ playerId, playerToken, gameId, isHost, initialGameState }) => {
        const session = { playerId, playerToken, gameId };
        localStorage.setItem('wordScrambleSession', JSON.stringify(session));
        isLoading.set(false);
        view.set('playerGame');
        currentPlayer.set({ id: playerId, isHost, token: playerToken });
        gameState.set(initialGameState);
        error.set({ ...initialErrorState });
        joinForm.set({ gameId: '', playerName: '', avatar: '' }); // Reset form
    });

    socket.on('player-reconnected', ({ gameState: newGameState, partialAnswers: serverPartialAnswers }) => {
        const playerSession = JSON.parse(localStorage.getItem('wordScrambleSession'));
        const hostSession = JSON.parse(localStorage.getItem('wordScrambleHostSession'));
        
        const _isHostDisplay = !playerSession && !!hostSession;
        const newView = _isHostDisplay ? 'hostDisplay' : 'playerGame';
        console.log(`Player/Host reconnected. Setting view to: ${newView}`);
        
        let newCurrentPlayer = null;
        if (playerSession?.playerId) {
             const reconnectedPlayerInGame = newGameState.players.find(p => p.id === playerSession.playerId);
             if (reconnectedPlayerInGame) {
                newCurrentPlayer = {
                    id: playerSession.playerId,
                    token: playerSession.playerToken,
                    isHost: reconnectedPlayerInGame.isHost
                };
             }
        }
        
        isHostDisplay.set(_isHostDisplay);
        view.set(newView);
        gameState.set(newGameState);
        currentPlayer.set(newCurrentPlayer);
        partialAnswers = serverPartialAnswers || {};

        // Important: Clear loading/error state *after* all other state has been updated
        // to ensure the UI transitions smoothly away from the loading screen.
        isLoading.set(false);
        error.set({ ...initialErrorState });
    });

    socket.on('reconnect-failed', () => {
        console.log('Reconnect failed by server.');
        const wasPlayerAttempt = !!localStorage.getItem('wordScrambleSession');

        localStorage.removeItem('wordScrambleSession');
        localStorage.removeItem('wordScrambleHostSession');
        
        isLoading.set(false);
        if (wasPlayerAttempt) {
            view.set('joinPrompt');
            error.set({ message: get(t).reconnectFailed, fatal: false, context: null });
        } else {
            view.set('mainMenu');
            error.set({ ...initialErrorState });
        }
    });

    socket.on('error-message', (data) => {
        console.error("Received error from server:", data);
        const errorMessage = get(t)[data.key] || data.defaultText || get(t).errorOccurred;
        isLoading.set(false);
        error.set({
            message: errorMessage,
            fatal: data.fatal === true, // Default to non-fatal
            context: data.context || null
        });
    });

    socket.on('all-players-left', () => {
        console.log("All players have left the game. Host display will reset.");
        flyingEmojis.set([]);
        if (get(isHostDisplay)) {
            resetToMenu();
        }
    });

    socket.on('game-force-ended', () => {
        console.log("Game was force-ended by host.");
        const message = get(t).gameEndedByHost;
        
        // Immediately perform a full reset to the main menu state.
        resetToMenu();
        
        // Then, set a non-fatal error message to inform the user what happened.
        // This will be displayed on the Main Menu screen.
        error.set({ 
            message: message, 
            fatal: false, 
            context: null 
        });
    });

    socket.on('lobby-emoji-sent', ({ avatar, emoji, playerName }) => {
        const id = Date.now() + Math.random();
        const startX = Math.floor(Math.random() * 75 + 10);
        const endX = Math.max(5, Math.min(90, startX + (Math.random() * 30 - 15)));
        const startRotate = Math.floor(Math.random() * 40 - 20);
        const endRotate = Math.floor(Math.random() * 180 - 90);

        flyingEmojis.update(emojis => {
            const next = [...emojis, {
                id,
                avatar: avatar,
                emoji: emoji || null,
                playerName: playerName || '',
                startX,
                endX,
                startRotate,
                endRotate
            }];
            return next.length > 25 ? next.slice(next.length - 25) : next;
        });

        // Guaranteed auto-cleanup failsafe after 4.5s
        setTimeout(() => {
            flyingEmojis.update(all => all.filter(e => e.id !== id));
        }, 4500);
    });

    socket.on('time-boost-used', (data) => {
        console.log('[Time Boost] Used by:', data);
        activeTimeBoostNotice.set(data);
        setTimeout(() => {
            activeTimeBoostNotice.update(current => current?.playerId === data.playerId ? null : current);
        }, 4000);
    });
    
    socket.on('play-sound', ({ soundId }) => {
        playSound(soundId);
    });
}

export function reconnectSocket() {
    const playerSession = JSON.parse(localStorage.getItem('wordScrambleSession'));
    const hostSession = JSON.parse(localStorage.getItem('wordScrambleHostSession'));

    if (!socket) {
        initializeSocket();
        return;
    }

    if (!socket.connected) {
        console.log("Reconnecting socket explicitly...");
        isLoading.set(true);
        error.set({ ...initialErrorState });
        socket.connect();
    } else {
        if (playerSession?.playerId && playerSession?.playerToken && playerSession?.gameId) {
            console.log("Resending reconnect-player payload...");
            isLoading.set(true);
            error.set({ ...initialErrorState });
            socket.emit('reconnect-player', playerSession);
        } else if (hostSession?.gameId) {
            console.log("Resending join-as-host-display payload...");
            isLoading.set(true);
            error.set({ ...initialErrorState });
            socket.emit('join-as-host-display', { gameId: hostSession.gameId });
        }
    }
}

export function changeView(newView) {
    view.set(newView);
    error.set({ ...initialErrorState });
    if (newView !== 'joinPrompt') {
        joinForm.set({ gameId: '', playerName: '', avatar: '' });
    }
}

export function setLanguage(lang) {
    localStorage.setItem('wordScrambleLang', lang);
    language.set(lang);
    view.set('mainMenu');
}

export function sendMessage(event, payload) {
    if (payload && payload.loading) {
        isLoading.set(true);
        error.set({ ...initialErrorState });
        delete payload.loading;
    }
    // Clear non-fatal errors when a new action is taken
    const currentError = get(error);
    if (currentError.message && !currentError.fatal) {
         error.set({ ...initialErrorState });
    }
    socket.emit(event, payload);
}

export function resetToMenu() {
     localStorage.removeItem('wordScrambleSession');
     localStorage.removeItem('wordScrambleHostSession');
     flyingEmojis.set([]);
     view.set('mainMenu');
     gameState.set(null);
     currentPlayer.set(null);
     isLoading.set(false);
     error.set({ ...initialErrorState });
     isHostDisplay.set(false);
     showBattleHistory.set(false);
     stopMusic();
}

export function getPartialAnswers() {
    return partialAnswers;
}

export function clearConsumedPartialAnswers() {
    partialAnswers = {};
}
