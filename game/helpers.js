// game/helpers.js
import os from 'os';
import { getGame } from './manager.js';

// --- Network Helpers ---
export function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost'; // Fallback for environments where detection fails
}

/**
 * Shuffles an array in-place using the Fisher-Yates (aka Knuth) algorithm.
 * This is more reliable and performant than `array.sort(() => 0.5 - Math.random())`.
 * @param {Array} array The array to shuffle.
 */
export function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


// --- ID and Token Generation ---
export function generateGameId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function generatePlayerId() {
  return Math.random().toString(36).substring(2, 12);
}

export function generatePlayerToken() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

// --- Game State Management Helpers ---

/**
 * Creates a "clean" version of the game state suitable for sending to clients.
 * This function uses an "allowlist" approach, explicitly building a new object
 * with only the properties that are safe and necessary for the client.
 * @param {object} game The full game state object from the server.
 * @returns {object} A sanitized game state object ready for JSON stringification.
 */
export function getSanitizedGameState(game) {
    if (!game) return null;

    // Sanitize players first, removing sensitive tokens.
    const sanitizedPlayers = game.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        socketId: p.socketId,
        score: p.score,
        isHost: p.isHost,
    }));
    
    // Calculate remaining time on the server to be the source of truth.
    // If phaseEndTime is not set, there is no active timer.
    const remainingTime = game.phaseEndTime && !game.isPaused
        ? Math.max(0, Math.round((game.phaseEndTime - Date.now()) / 1000))
        : 0;

    // Explicitly build the state object that will be sent to clients.
    const sanitizedGame = {
        id: game.id,
        serverIP: game.serverIP,
        language: game.language,
        phase: game.phase,
        isPaused: game.isPaused,
        currentRound: game.currentRound,
        currentVotingBattleIndex: game.currentVotingBattleIndex,
        phaseTimer: remainingTime, // This is the calculated countdown value
        // We don't send phaseEndTime to the client, they only need the countdown.
        theme: game.theme,
        colorTheme: game.colorTheme,
        sillyMode: game.sillyMode,
        is18PlusMode: game.is18PlusMode,
        slowpokeMode: game.slowpokeMode,
        soundsOnHostOnly: game.soundsOnHostOnly,
        isGeneratingThemes: game.isGeneratingThemes,
        geminiApiErrorCount: game.geminiApiErrorCount, // For host player UI
        preGeneratedThemes: game.preGeneratedThemes,
        
        // Complex objects that are needed by the client and are serializable.
        players: sanitizedPlayers,
        playerAnswers: game.playerAnswers, 
        battleSchedule: game.battleSchedule,
        battleHistory: game.battleHistory || [],
    };

    return sanitizedGame;
}


export function broadcastGameState(io, gameId) {
    const game = getGame(gameId);
    if (game) {
        const sanitizedState = getSanitizedGameState(game);
        io.to(gameId).emit('game-state-update', sanitizedState);
    }
}

export function broadcastTimerTick(io, gameId) {
    const game = getGame(gameId);
    if (!game) return;
    const remainingTime = game.phaseEndTime && !game.isPaused
        ? Math.max(0, Math.round((game.phaseEndTime - Date.now()) / 1000))
        : 0;
    io.to(gameId).emit('timer-tick', { phaseTimer: remainingTime, phase: game.phase });
}

/**
 * Emits a 'play-sound' event to the appropriate clients based on game config.
 * @param {import('socket.io').Server} io The Socket.IO server instance.
 * @param {object} game The game object.
 * @param {string} soundId The ID of the sound to play.
 */
export function playSoundOnClients(io, game, soundId) {
    if (game.soundsOnHostOnly) {
        if (game.hostDisplaySocketId) {
            io.to(game.hostDisplaySocketId).emit('play-sound', { soundId });
        }
    } else {
        io.to(game.id).emit('play-sound', { soundId });
    }
}

export function assignHostPlayer(game) {
    if (game.players.length > 0) {
        const currentHost = game.players.find(p => p.isHost);
        // Find connected players
        const connectedPlayers = game.players.filter(p => p.socketId);

        // If there are no connected players, do nothing.
        if (connectedPlayers.length === 0) {
            if(currentHost) currentHost.isHost = false; // no host if no one is connected
            return;
        };

        // If the current host is disconnected OR there's no host, assign a new one.
        if (!currentHost || !currentHost.socketId) {
            // Demote the old host if they exist
            if(currentHost) currentHost.isHost = false;
            // Promote the first connected player
            const newHost = connectedPlayers[0];
            if (newHost) {
                newHost.isHost = true;
                console.log(`[Game ${game.id}] New host assigned: ${newHost.name}`);
            }
        }
    }
}

// --- Text Processing Helpers ---

// A new, language-agnostic function to correctly tokenize text.
// It uses a Unicode-aware regex to handle both English and Ukrainian text.
export function tokenizeText(text) {
    if (!text) return [];
    // This Unicode-aware regex captures sequences of letters (including numbers and apostrophes/hyphens),
    // sequences of 3 or more underscores, or any standalone punctuation. The 'u' flag is for Unicode.
    const tokenizerRegex = /[\p{L}\p{N}'’`-]+|_{3,}|[.,!?;:()"]/gu;
    return text.match(tokenizerRegex) || [];
}

/** Helper function to split text into sentence and clause-like chunks. */
export function getChunksFromText(text) {
    if (!text) return [];
    
    // Split by major punctuation boundaries first (. ! ? , ; : em-dash newline)
    const preliminaryChunks = text.split(/(?<=[.!?,;:—–\n])\s+/);
    
    const finalChunks = [];
    preliminaryChunks.forEach(chunk => {
        const trimmedChunk = chunk.trim();
        if (!trimmedChunk) return;

        // Also split within the chunk if it contains strong subordinate conjunctions
        // using lookahead or splitting on conjunction boundaries
        const subParts = trimmedChunk.split(/\s+(?=(?:because|although|however|when|while|бо|тому що|якщо|коли|хоча|але)\b)/i);

        subParts.forEach(part => {
            const cleanChunk = part.replace(/^[.,!?;:—–-]+\s*|\s*[.,!?;:—–-]+$/g, '').trim();
            if (!cleanChunk) return;

            const words = cleanChunk.split(/\s+/).filter(w => w.length > 0);
            if (words.length > 8) {
                const CHUNK_SIZE = 5;
                for (let i = 0; i < words.length; i += CHUNK_SIZE) {
                    const subChunk = words.slice(i, i + CHUNK_SIZE).join(' ');
                    if (subChunk.trim().length > 0) {
                        finalChunks.push(subChunk.trim());
                    }
                }
            } else {
                finalChunks.push(cleanChunk);
            }
        });
    });

    return finalChunks.filter(c => c.length > 0);
}