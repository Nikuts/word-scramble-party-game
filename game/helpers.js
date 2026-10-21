// game/helpers.js
import os from 'os';
import crypto from 'crypto';
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


// --- ID and Token Generation (Cryptographically Secure) ---
const GAME_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateGameId() {
    let id = '';
    for (let i = 0; i < 4; i++) {
        id += GAME_ID_CHARS[crypto.randomInt(0, GAME_ID_CHARS.length)];
    }
    return id;
}

export function generatePlayerId() {
    return crypto.randomBytes(6).toString('hex');
}

export function generatePlayerToken() {
    return crypto.randomBytes(24).toString('hex');
}

// --- Socket Identity & Authorization Helpers ---
export function bindSocketToGame(socket, gameId, { playerId = null, isHostDisplay = false } = {}) {
    if (!socket) return;
    socket.data = socket.data || {};
    socket.data.gameId = gameId;
    if (playerId) socket.data.playerId = playerId;
    if (isHostDisplay) socket.data.isHostDisplay = true;
}

/**
 * Resolves the authenticated player for a socket connection.
 * Never trusts a client-supplied playerId if it conflicts with the socket's bound player.
 */
export function getAuthenticatedPlayer(game, socket, fallbackPlayerId = null) {
    if (!game || !Array.isArray(game.players)) return null;

    if (socket?.data?.playerId) {
        const boundPlayer = game.players.find(p => p.id === socket.data.playerId);
        if (boundPlayer && (!socket.id || !boundPlayer.socketId || boundPlayer.socketId === socket.id)) {
            if (fallbackPlayerId && fallbackPlayerId !== boundPlayer.id) return null;
            return boundPlayer;
        }
        return null;
    }

    if (socket?.id) {
        const socketPlayer = game.players.find(p => p.socketId === socket.id);
        if (!socketPlayer) return null;
        if (fallbackPlayerId && fallbackPlayerId !== socketPlayer.id) return null;
        return socketPlayer;
    }

    // Fallback only for headless unit tests that pass a bare mock socket `{}`
    if (fallbackPlayerId) {
        return game.players.find(p => p.id === fallbackPlayerId) || null;
    }
    return null;
}

/**
 * Checks whether the socket is either the Host TV Display or the designated Host Player.
 */
export function isHostOrHostDisplay(game, socket) {
    if (!game) return false;
    if (socket?.data?.isHostDisplay && (!socket.id || game.hostDisplaySocketId === socket.id)) {
        return true;
    }
    if (socket?.id && game.hostDisplaySocketId === socket.id) {
        return true;
    }
    const player = getAuthenticatedPlayer(game, socket);
    return Boolean(player?.isHost);
}

// --- Game State Management Helpers ---

/**
 * Creates a "clean" version of the game state suitable for sending to clients.
 * This function uses an "allowlist" approach, explicitly building a new object
 * with only the properties that are safe and necessary for the client.
 * @param {object} game The full game state object from the server.
 * @returns {object} A sanitized game state object ready for JSON stringification.
 */
function sanitizePlayerAnswersForViewer(game, viewer) {
    const rawPlayerAnswers = game.playerAnswers || {};
    const isPlayer = viewer?.role === 'player' && Boolean(viewer.playerId);

    if (isPlayer) {
        const myData = rawPlayerAnswers[viewer.playerId];
        return myData ? { [viewer.playerId]: myData } : {};
    }

    // Host display only needs progress counts (total questions vs answered questions)
    const hostPlayerAnswers = {};
    Object.entries(rawPlayerAnswers).forEach(([pId, pa]) => {
        if (!pa) return;
        hostPlayerAnswers[pId] = {
            submittedAll: Boolean(pa.submittedAll),
            questions: (pa.questions || []).map(q => ({
                id: q.id,
                answer: Boolean(q.answer)
            }))
        };
    });
    return hostPlayerAnswers;
}

function sanitizeBattleScheduleForViewer(game, viewer) {
    const schedule = game.battleSchedule || [];
    if (schedule.length === 0) return [];

    const phase = game.phase;
    const isPlayer = viewer?.role === 'player' && Boolean(viewer.playerId);
    const playerId = isPlayer ? viewer.playerId : null;

    if (phase === 'battle_get_ready' || phase === 'battle_answering') {
        if (isPlayer) {
            return schedule.map(b => {
                if (b.competitors?.includes(playerId)) {
                    const promptTokens = (b.promptTokens || []).map((t, idx) =>
                        typeof t === 'object' && t !== null
                            ? { id: t.id || `p_${idx}`, text: t.text }
                            : { id: `p_${idx}`, text: String(t) }
                    );
                    const myBank = (b.wordBanks?.[playerId] || []).map((t, idx) =>
                        typeof t === 'object' && t !== null
                            ? { id: t.id || `b_${idx}`, text: t.text }
                            : { id: `b_${idx}`, text: String(t) }
                    );
                    const myAnswers = b.answers?.[playerId] ? { [playerId]: b.answers[playerId] } : {};
                    return {
                        id: b.id,
                        competitors: b.competitors || [],
                        formatConfig: b.formatConfig,
                        prompt: b.prompt,
                        genre: b.genre,
                        premise: b.premise,
                        promptTokens,
                        wordBanks: { [playerId]: myBank },
                        answers: myAnswers,
                        votes: {}
                    };
                }
                return {
                    id: b.id,
                    competitors: b.competitors || [],
                    formatConfig: b.formatConfig,
                    prompt: b.prompt,
                    genre: b.genre,
                    premise: b.premise,
                    promptTokens: [],
                    wordBanks: {},
                    answers: {},
                    votes: {}
                };
            });
        }

        // Host display during battle_get_ready / battle_answering: only boolean progress flags
        return schedule.map(b => {
            const answeredFlags = {};
            (b.competitors || []).forEach(cId => {
                if (b.answers?.[cId]) answeredFlags[cId] = true;
            });
            return {
                id: b.id,
                competitors: b.competitors || [],
                formatConfig: b.formatConfig,
                prompt: b.prompt,
                genre: b.genre,
                premise: b.premise,
                promptTokens: [],
                wordBanks: {},
                answers: answeredFlags,
                votes: {}
            };
        });
    }

    if (phase === 'voting_get_ready' || phase === 'battle_voting') {
        return schedule.map((b, index) => {
            if (index !== game.currentVotingBattleIndex) {
                return {
                    id: b.id,
                    competitors: [],
                    promptTokens: [],
                    wordBanks: {},
                    answers: {},
                    votes: {}
                };
            }

            const optionOrder = b.optionOrder || b.competitors || [];
            const votingOptions = optionOrder.map((cId, idx) => ({
                optionId: `opt_${idx}`,
                answer: b.answers?.[cId]
            }));
            const anonymousAnswers = {};
            votingOptions.forEach(opt => {
                anonymousAnswers[opt.optionId] = opt.answer;
            });
            const votedCount = Object.keys(b.votes || {}).length;
            const totalVoters = (game.players || []).filter(p => p.socketId && !(b.competitors || []).includes(p.id)).length;
            const isCompetitor = isPlayer ? Boolean(b.competitors?.includes(playerId)) : false;
            const hasVoted = isPlayer ? Boolean(b.votes?.[playerId]) : false;

            return {
                id: b.id,
                formatConfig: b.formatConfig,
                prompt: b.prompt,
                genre: b.genre,
                premise: b.premise,
                competitorCount: (b.competitors || []).length,
                votingOptions,
                votedCount,
                totalVoters,
                isCompetitor,
                hasVoted,
                competitors: [],
                answers: anonymousAnswers,
                votes: hasVoted && playerId ? { [playerId]: true } : {},
                wordBanks: {},
                promptTokens: []
            };
        });
    }

    if (phase === 'battle_result_reveal') {
        return schedule.map((b, index) => {
            if (index !== game.currentVotingBattleIndex) {
                return {
                    id: b.id,
                    competitors: [],
                    promptTokens: [],
                    wordBanks: {},
                    answers: {},
                    votes: {}
                };
            }
            return {
                id: b.id,
                competitors: b.competitors || [],
                formatConfig: b.formatConfig,
                prompt: b.prompt,
                genre: b.genre,
                premise: b.premise,
                answers: b.answers || {},
                votes: b.votes || {},
                winnerId: b.winnerId || null,
                pointsAwarded: b.pointsAwarded || {},
                scoreBreakdown: b.scoreBreakdown || {},
                annotatedAnswers: b.annotatedAnswers || {},
                royalties: b.royalties || [],
                wordBanks: {},
                promptTokens: []
            };
        });
    }

    return [];
}

function sanitizeBattleHistoryForViewer(game) {
    if (game.phase !== 'results') return [];
    return (game.battleHistory || []).map(b => ({
        id: b.id,
        competitors: b.competitors || [],
        formatConfig: b.formatConfig,
        prompt: b.prompt,
        genre: b.genre,
        premise: b.premise,
        answers: b.answers || {},
        votes: b.votes || {},
        winnerId: b.winnerId || null,
        pointsAwarded: b.pointsAwarded || {},
        scoreBreakdown: b.scoreBreakdown || {},
        annotatedAnswers: b.annotatedAnswers || {},
        royalties: b.royalties || []
    }));
}

export function getSanitizedGameState(game, viewer = { role: 'hostDisplay' }) {
    if (!game) return null;

    // Sanitize players first, removing sensitive tokens.
    const sanitizedPlayers = (game.players || []).map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        socketId: p.socketId,
        score: p.score,
        isHost: p.isHost,
        hasUsedTimeBoost: !!p.hasUsedTimeBoost,
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
        
        // Tailored per-viewer payloads (R3)
        players: sanitizedPlayers,
        playerAnswers: sanitizePlayerAnswersForViewer(game, viewer),
        battleSchedule: sanitizeBattleScheduleForViewer(game, viewer),
        battleHistory: sanitizeBattleHistoryForViewer(game),
        superlatives: game.superlatives || null,
    };

    return sanitizedGame;
}


export function broadcastGameState(io, gameId) {
    const game = getGame(gameId);
    if (!game) return;

    let sentAny = false;
    if (game.hostDisplaySocketId) {
        const hostState = getSanitizedGameState(game, { role: 'hostDisplay' });
        io.to(game.hostDisplaySocketId).emit('game-state-update', hostState);
        sentAny = true;
    }

    (game.players || []).forEach(p => {
        if (p.socketId) {
            const playerState = getSanitizedGameState(game, { role: 'player', playerId: p.id });
            io.to(p.socketId).emit('game-state-update', playerState);
            sentAny = true;
        }
    });

    if (!sentAny) {
        const defaultState = getSanitizedGameState(game, { role: 'hostDisplay' });
        io.to(gameId).emit('game-state-update', defaultState);
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

// A language-agnostic function to correctly tokenize text.
// It uses a Unicode-aware regex to handle both English and Ukrainian text.
export function tokenizeText(text) {
    if (!text) return [];
    // This Unicode-aware regex captures sequences of letters (including numbers and apostrophes/hyphens),
    // sequences of 3 or more underscores, or any standalone punctuation. The 'u' flag is for Unicode.
    const tokenizerRegex = /[\p{L}\p{N}'’`ʼ-]+|_{3,}|[.,!?;:()"-]/gu;
    return text.match(tokenizerRegex) || [];
}

/** Formats answer string to ensure natural typographic spacing before punctuation. */
export function formatAnswerText(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text
        .replace(/\s+([.,!?:;…])/gu, '$1')
        .replace(/(^|\s)(["'“‘(\[])\s+/gu, '$1$2')
        .replace(/\s+(["'”’)\],.:;!?…])(\s|$|[.,!?:;…])/gu, '$1$2')
        .trim();
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
        // using Unicode-aware boundary (?=[^\p{L}\p{N}]|$) to handle Cyrillic and English conjunctions
        const subParts = trimmedChunk.split(/\s+(?=(?:because|although|however|when|while|бо|тому що|якщо|коли|хоча|але)(?:[^\p{L}\p{N}]|$))/iu);

        subParts.forEach(part => {
            const cleanChunk = part.replace(/^[.,!?;:—–"()\[\]{}-]+\s*|\s*[.,!?;:—–"()\[\]{}-]+$/gu, '').trim();
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