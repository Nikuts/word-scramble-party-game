import { writable, get, derived } from 'svelte/store';
import { io } from 'socket.io-client';
import { playSound, playMusic, stopMusic, soundEngine } from './lib/utils.js';
import { musicManager } from './lib/audio/musicManager.js';
import { UI_TEXT } from './ui_text.js';
import { TV_MAX_CONCURRENT_REACTIONS } from './lib/config.js';

// --- Individual, Granular Stores for Better Performance ---
export const view = writable('language'); // 'language', 'mainMenu', 'joinPrompt', 'hostDisplay', 'playerGame', 'instructions'
export const language = writable(localStorage.getItem('wordScrambleLang') || 'en');
export const gameState = writable(null);
export const currentPlayer = writable(null);
export const error = writable({ message: null, fatal: false, context: null });
export const isLoading = writable(false);
export const isReconnecting = writable(false);
export const isHostDisplay = writable(false);
export const joinForm = writable({ gameId: '', playerName: '', avatar: '' });
export const showBattleHistory = writable(false);
export const flyingEmojis = writable([]);
export const activeTimeBoostNotice = writable(null);
export const activeAllVotesInNotice = writable(false);
export const hasConfirmedAvatar = writable(false);
export const toasts = writable([]);

let nextToastId = 1;
export function showToast(message, { variant = 'danger', duration = 6000 } = {}) {
    const cleanMsg = String(message || '').trim();
    if (!cleanMsg) return null;
    const id = nextToastId++;
    toasts.update((list) => [...list.slice(-3), { id, message: cleanMsg, variant, duration }]);
    return id;
}

export function dismissToast(id) {
    toasts.update((list) => list.filter((item) => item.id !== id));
}

isHostDisplay.subscribe((isHost) => {
    if (isHost) {
        soundEngine.enableHostPreload();
    }
});

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
export const musicMuted = writable(musicManager.isMuted);

export function toggleMusicMuted() {
    let nextMuted = false;
    musicMuted.update(val => {
        nextMuted = !val;
        return nextMuted;
    });
    const currentGame = get(gameState);
    const cp = get(currentPlayer);
    if (get(isHostDisplay) || !currentGame?.id) {
        musicManager.setMuted(nextMuted);
        if (!nextMuted && get(isHostDisplay) && get(view) === 'hostDisplay' && currentGame?.phase) {
            playMusic(currentGame.phase, { round: currentGame.currentRound });
        }
    }
    const canSyncMusic = Boolean(socket?.connected && currentGame?.id && (get(isHostDisplay) || cp?.isHost));
    if (canSyncMusic) {
        socket.emit('set-music-muted', { gameId: currentGame.id, musicMuted: nextMuted });
    }
}

function syncHostDisplayMusic(state) {
    if (!get(isHostDisplay) || get(view) !== 'hostDisplay' || !state?.phase) return;
    playMusic(state.phase, { round: state.currentRound });
}

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
    let nextVal = false;
    tvMode.update(val => {
        nextVal = !val;
        return nextVal;
    });
    const currentGame = get(gameState);
    const cp = get(currentPlayer);
    const canSyncTv = Boolean(socket?.connected && currentGame?.id && (get(isHostDisplay) || cp?.isHost));
    if (canSyncTv) {
        socket.emit('set-tv-mode', { gameId: currentGame.id, tvMode: nextVal });
    }
}

export function sendReaction(reaction = 'avatar') {
    const currentGame = get(gameState);
    if (!socket || !currentGame?.id) return;
    socket.emit('send-lobby-emoji', { gameId: currentGame.id, reaction });
}

// --- Base Derived Stores ---
export const t = derived(language, $language => {
    const lang = ($language === 'ua' || $language === 'uk') ? 'uk' : 'en';
    return UI_TEXT[lang] || UI_TEXT.en;
});

if (typeof document !== 'undefined') {
    language.subscribe(($language) => {
        const htmlLang = ($language === 'ua' || $language === 'uk') ? 'uk' : 'en';
        if (document.documentElement && document.documentElement.lang !== htmlLang) {
            document.documentElement.lang = htmlLang;
        }
    });
}

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
let lifecycleListenersBound = false;
let lastHiddenAt = 0;
let lastResumeAttemptAt = 0;
const initialErrorState = { message: null, fatal: false, context: null };
const TIMER_PHASES_FOR_TICK = ['question', 'battle_answering', 'battle_voting'];

export function handleCountdownTick(phase, remaining, soundsOnHostOnly = true) {
    const _isHostDisplay = get(isHostDisplay);

    if (TIMER_PHASES_FOR_TICK.includes(phase) && remaining <= 10 && remaining > 0) {
        if (remaining !== lastTickSecond) {
            if (!soundsOnHostOnly || _isHostDisplay) {
                const pitch = remaining <= 5 ? (1.0 + (5 - remaining) * 0.06) : 1.0;
                playSound('sfx_timer_tick', { pitch });
            }
            if (!_isHostDisplay && remaining <= 5) {
                const g = get(gameState);
                const cp = get(currentPlayer);
                let hasCompletedPhaseAction = false;
                if (g && cp) {
                    if (phase === 'question') {
                        hasCompletedPhaseAction = Boolean(g.playerAnswers?.[cp.id]?.submittedAll);
                    } else if (phase === 'battle_answering') {
                        const myBattles = (g.battleSchedule || []).filter(b => b.competitors?.includes(cp.id));
                        hasCompletedPhaseAction = myBattles.length > 0 && myBattles.every(b => Boolean(b.answers?.[cp.id]));
                    } else if (phase === 'battle_voting') {
                        const curBattle = g.battleSchedule?.[g.currentVotingBattleIndex];
                        hasCompletedPhaseAction = !curBattle || curBattle.competitors?.includes(cp.id) || Boolean(curBattle.votes?.[cp.id]);
                    }
                }
                if (!hasCompletedPhaseAction) {
                    try {
                        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                            navigator.vibrate(40);
                        }
                    } catch (e) {}
                }
            }
            lastTickSecond = remaining;
        }
    } else {
        lastTickSecond = -1;
    }
}

// --- Actions and Socket Logic ---

function readStoredSession(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
        return null;
    }
}

function attemptSilentResume(force = false) {
    if (!socket || typeof window === 'undefined') return;
    const playerSession = readStoredSession('wordScrambleSession');
    const hostSession = readStoredSession('wordScrambleHostSession');
    const hasActiveSession = Boolean((playerSession?.playerId && playerSession?.playerToken && playerSession?.gameId) || hostSession?.gameId);
    if (!hasActiveSession) return;

    const now = Date.now();
    if (!force && now - lastResumeAttemptAt < 1200) return;

    if (!socket.connected) {
        lastResumeAttemptAt = now;
        isReconnecting.set(true);
        socket.connect();
    } else if (force) {
        lastResumeAttemptAt = now;
        if (playerSession?.playerId && playerSession?.playerToken && playerSession?.gameId) {
            socket.emit('reconnect-player', playerSession);
        } else if (hostSession?.gameId) {
            socket.emit('join-as-host-display', { gameId: hostSession.gameId });
        }
    }
}

function bindLifecycleListeners() {
    if (lifecycleListenersBound || typeof window === 'undefined' || typeof document === 'undefined') return;
    lifecycleListenersBound = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            lastHiddenAt = Date.now();
        } else if (document.visibilityState === 'visible') {
            const awayMs = lastHiddenAt ? Date.now() - lastHiddenAt : 0;
            attemptSilentResume(awayMs >= 3000);
        }
    });

    window.addEventListener('pageshow', (evt) => {
        if (evt.persisted || !socket?.connected) {
            attemptSilentResume(true);
        }
    });

    window.addEventListener('focus', () => {
        if (!socket?.connected) {
            attemptSilentResume(false);
        }
    });
}

export function initializeSocket() {
    if (socket) return;
    socket = io({
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });
    bindLifecycleListeners();

    socket.on('connect', () => {
        console.log('Connected to server!');
        isReconnecting.set(false);
        const playerSession = readStoredSession('wordScrambleSession');
        const hostSession = readStoredSession('wordScrambleHostSession');

        if (playerSession?.playerId && playerSession?.playerToken && playerSession?.gameId) {
            console.log("Found player session, attempting to reconnect...");
            if (!get(gameState)) {
                isLoading.set(true);
            } else {
                isReconnecting.set(true);
            }
            error.set({ ...initialErrorState });
            clearConsumedPartialAnswers(); // Clear any stale answers before reconnecting
            socket.emit('reconnect-player', playerSession);
        } else if (hostSession?.gameId) {
            console.log("Found host session, attempting to reconnect host display...");
            if (!get(gameState)) {
                isLoading.set(true);
            } else {
                isReconnecting.set(true);
            }
            error.set({ ...initialErrorState });
            socket.emit('join-as-host-display', { gameId: hostSession.gameId });
        } else {
             isLoading.set(false);
             isReconnecting.set(false);
             error.set({ ...initialErrorState });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        const playerSession = readStoredSession('wordScrambleSession');
        const hostSession = readStoredSession('wordScrambleHostSession');
        const inSession = Boolean(get(gameState) || playerSession?.gameId || hostSession?.gameId);
        if (inSession) {
            isReconnecting.set(true);
        } else {
            isLoading.set(false);
            if (reason === 'io server disconnect' && !get(error)?.fatal) {
                socket.connect();
            }
        }
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
        
        const previousPhase = get(gameState)?.phase;
        if (newGameState.phase && newGameState.phase !== 'lobby') {
            hasConfirmedAvatar.set(true);
        } else if (previousPhase && previousPhase !== 'lobby' && newGameState.phase === 'lobby') {
            // Returning to lobby via Play Again
            hasConfirmedAvatar.set(true);
        }

        if (
            newGameState.phase === 'lobby' ||
            newGameState.phase === 'generating_round' ||
            newGameState.phase === 'get_ready' ||
            newGameState.phase === 'preparing_battles' ||
            newGameState.phase === 'battle_get_ready' ||
            newGameState.phase === 'results'
        ) {
            clearConsumedPartialAnswers();
        }

        if (previousPhase && newGameState.phase !== previousPhase && !['battle_voting', 'battle_result_reveal', 'results'].includes(newGameState.phase)) {
            flyingEmojis.set([]);
        }

        isLoading.set(false);
        isReconnecting.set(false);
        error.set({ ...initialErrorState });
        if (get(isHostDisplay) && typeof newGameState.tvMode === 'boolean' && get(tvMode) !== newGameState.tvMode) {
            tvMode.set(newGameState.tvMode);
        }
        if (typeof newGameState.musicMuted === 'boolean' && get(musicMuted) !== newGameState.musicMuted) {
            musicMuted.set(newGameState.musicMuted);
            if (get(isHostDisplay)) {
                musicManager.setMuted(newGameState.musicMuted);
            }
        }
        gameState.set(newGameState);
        currentPlayer.set(updatedPlayer);
        syncHostDisplayMusic(newGameState);

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
        
        handleCountdownTick(newGameState.phase, newGameState.phaseTimer, newGameState.soundsOnHostOnly);
    });

    socket.on('timer-tick', ({ phaseTimer: remaining, phase }) => {
        gameState.update(g => {
            if (!g || g.phase !== phase) return g;
            return { ...g, phaseTimer: remaining };
        });

        const currentGameState = get(gameState);
        handleCountdownTick(phase, remaining, currentGameState?.soundsOnHostOnly);
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
        hasConfirmedAvatar.set(false);
        isLoading.set(false);
        view.set('playerGame');
        currentPlayer.set({ id: playerId, isHost, token: playerToken });
        if (typeof initialGameState?.musicMuted === 'boolean') {
            musicMuted.set(initialGameState.musicMuted);
        }
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
        
        hasConfirmedAvatar.set(true);
        isHostDisplay.set(_isHostDisplay);
        if (typeof newGameState.tvMode === 'boolean' && get(tvMode) !== newGameState.tvMode) {
            tvMode.set(newGameState.tvMode);
        }
        if (typeof newGameState.musicMuted === 'boolean' && get(musicMuted) !== newGameState.musicMuted) {
            musicMuted.set(newGameState.musicMuted);
            if (_isHostDisplay) {
                musicManager.setMuted(newGameState.musicMuted);
            }
        }
        view.set(newView);
        gameState.set(newGameState);
        currentPlayer.set(newCurrentPlayer);
        partialAnswers = serverPartialAnswers || {};
        if (_isHostDisplay) {
            syncHostDisplayMusic(newGameState);
        }

        // Important: Clear loading/error state *after* all other state has been updated
        // to ensure the UI transitions smoothly away from the loading screen.
        isLoading.set(false);
        isReconnecting.set(false);
        error.set({ ...initialErrorState });
    });

    socket.on('reconnect-failed', () => {
        console.log('Reconnect failed by server.');
        const wasPlayerAttempt = !!localStorage.getItem('wordScrambleSession');

        localStorage.removeItem('wordScrambleSession');
        localStorage.removeItem('wordScrambleHostSession');
        
        isLoading.set(false);
        isReconnecting.set(false);
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

    socket.on('lobby-emoji-sent', ({ avatar, emoji, reaction, playerName }) => {
        const id = Date.now() + Math.random();
        const isTv = Boolean(get(tvMode));
        const maxConcurrent = isTv ? TV_MAX_CONCURRENT_REACTIONS : 25;
        const startX = Math.floor(Math.random() * 75 + 10);
        const endX = Math.max(5, Math.min(90, startX + (Math.random() * 30 - 15)));
        const startRotate = isTv ? 0 : Math.floor(Math.random() * 40 - 20);
        const endRotate = isTv ? 0 : Math.floor(Math.random() * 180 - 90);

        flyingEmojis.update(emojis => {
            const next = [...emojis, {
                id,
                avatar: avatar,
                emoji: emoji || null,
                reaction: reaction || 'avatar',
                playerName: playerName || '',
                startX,
                endX,
                startRotate,
                endRotate
            }];
            return next.length > maxConcurrent ? next.slice(next.length - maxConcurrent) : next;
        });

        // Guaranteed auto-cleanup failsafe
        setTimeout(() => {
            flyingEmojis.update(all => all.filter(e => e.id !== id));
        }, isTv ? 2900 : 4500);
    });

    socket.on('time-boost-used', (data) => {
        console.log('[Time Boost] Used by:', data);
        activeTimeBoostNotice.set(data);
        setTimeout(() => {
            activeTimeBoostNotice.update(current => current?.playerId === data.playerId ? null : current);
        }, 4000);
    });

    socket.on('all-votes-in', () => {
        activeAllVotesInNotice.set(true);
        setTimeout(() => {
            activeAllVotesInNotice.set(false);
        }, 1800);
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
    if (newView !== 'hostDisplay') {
        stopMusic();
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
    if (socket && !socket.connected) {
        socket.connect();
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
     hasConfirmedAvatar.set(false);
     lastTickSecond = -1;
     isLoading.set(false);
     isReconnecting.set(false);
     error.set({ ...initialErrorState });
     isHostDisplay.set(false);
     showBattleHistory.set(false);
     toasts.set([]);
     stopMusic();
}

export function getPartialAnswers() {
    return partialAnswers;
}

export function clearConsumedPartialAnswers() {
    partialAnswers = {};
}
