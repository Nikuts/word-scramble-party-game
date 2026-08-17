// game/handlers/lobbyHandlers.js
import { generateThemes } from '../../geminiService.js';
import * as manager from '../manager.js';
import * as roundService from '../services/roundService.js';
import * as helpers from '../helpers.js';
import { FALLBACK_CONTENT } from '../fallbackContent.js';
import {
    MIN_PLAYERS,
    MAX_PLAYERS,
    SOUNDS_ON_HOST_ONLY,
    AVATARS
} from '../../src/lib/config.js';

export async function generateInitialThemes(io, game) {
    game.isGeneratingThemes = true;
    helpers.broadcastGameState(io, game.id);

    const fallbackThemes = {
        en: FALLBACK_CONTENT.en.map(p => p.theme),
        uk: FALLBACK_CONTENT.uk.map(p => p.theme)
    };
    
    try {
        let generatedThemes = null;
        if (game.geminiApiErrorCount < 3) {
            generatedThemes = await generateThemes(game.is18PlusMode, game.sillyMode);
            if (generatedThemes) {
                game.geminiApiErrorCount = 0;
            }
        }
        
        game.preGeneratedThemes = generatedThemes || fallbackThemes;
        if (!generatedThemes) {
            game.geminiApiErrorCount++;
        }
    } catch (e) {
        console.error("Error generating initial themes:", e);
        game.preGeneratedThemes = fallbackThemes;
        game.geminiApiErrorCount++;
    } finally {
        game.isGeneratingThemes = false;
        helpers.broadcastGameState(io, game.id);
    }
}

export async function handleCreateGame(io, socket, { language }) {
    const capacity = manager.checkServerCapacity();
    if (!capacity.allowed) {
        return socket.emit('error-message', {
            key: 'serverBusy',
            defaultText: "Server is currently at maximum capacity. Please try again in a few moments.",
            fatal: false
        });
    }

    let gameId = helpers.generateGameId();
    let attempts = 0;
    while (manager.getGame(gameId) && attempts < 50) {
        gameId = helpers.generateGameId();
        attempts++;
    }

    const serverIP = helpers.getLocalIpAddress();
    
    const game = {
        id: gameId,
        serverIP: serverIP,
        hostDisplaySocketId: socket.id,
        language: language,
        players: [],
        phase: 'lobby',
        isPaused: false, // For pausing the timer when all players disconnect
        currentRound: 0,
        currentVotingBattleIndex: 0,
        phaseTimerId: null,
        hostReassignmentTimerId: null,
        playerReconnectionTimers: {},
        inactivityTimeoutId: null, // For lobby cleanup
        playerActionCooldowns: new Map(),
        theme: '',
        colorTheme: 'arcade',
        sillyMode: false,
        is18PlusMode: false,
        slowpokeMode: false,
        soundsOnHostOnly: SOUNDS_ON_HOST_ONLY,
        isGeneratingThemes: false,
        answerHistory: [],
        battleHistory: [],
        playerSeenChunks: {}, // Tracks which chunks have been shown to which players
        geminiApiErrorCount: 0,
        usedFallbackThemes: [],
        partialAnswers: {}, // To store partial answers from clients
        preGeneratedFallbackWords: [],
        playerAnswers: {},
        preGeneratedThemes: { en: [], uk: [] },
    };
    manager.addGame(gameId, game);
    socket.join(gameId);
    if (socket) {
        socket.data = socket.data || {};
        socket.data.gameId = gameId;
    }
    socket.emit('game-created', { gameId });
    
    const INACTIVITY_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour
    game.inactivityTimeoutId = setTimeout(() => {
        const gameToCheck = manager.getGame(gameId);
        if (gameToCheck && gameToCheck.phase === 'lobby') {
            io.to(gameId).emit('error-message', { key: 'gameClosedInactivity', defaultText: 'Game was closed due to inactivity.', fatal: true });
            io.in(gameId).disconnectSockets(true);
            manager.deleteGame(gameId);
        }
    }, INACTIVITY_TIMEOUT);

    await generateInitialThemes(io, game);
}

export function handleJoinGame(io, socket, { gameId, playerName, language, avatar }) {
    const game = manager.getGame(gameId);
    if (!game) return socket.emit('error-message', { key: 'gameNotFound', defaultText: "Game not found.", fatal: false });
    if (game.phase !== 'lobby') return socket.emit('error-message', { key: 'gameAlreadyStarted', defaultText: "Game has already started.", fatal: false });
    if (game.players.length >= MAX_PLAYERS) return socket.emit('error-message', { key: 'lobbyFull', defaultText: "Lobby is full.", fatal: false });

    const takenNames = game.players.map(p => p.name.toLowerCase());
    const takenAvatars = game.players.map(p => p.avatar);
    const errorContext = { takenAvatars };

    if (takenNames.includes(playerName.toLowerCase())) {
        return socket.emit('error-message', { key: 'nameTaken', defaultText: "This name is already taken.", context: errorContext, fatal: false });
    }

    let assignedAvatar = avatar;
    if (!assignedAvatar || !AVATARS.includes(assignedAvatar) || takenAvatars.includes(assignedAvatar)) {
        // Auto-assign the first unselected avatar from AVATARS
        assignedAvatar = AVATARS.find(a => !takenAvatars.includes(a)) || AVATARS[0];
    }

    const player = {
        id: helpers.generatePlayerId(),
        token: helpers.generatePlayerToken(),
        name: playerName,
        avatar: assignedAvatar,
        socketId: socket.id,
        score: 0,
        isHost: game.players.length === 0,
    };

    game.players.push(player);
    socket.join(gameId);
    if (socket) {
        socket.data = socket.data || {};
        socket.data.gameId = gameId;
    }
    
    socket.emit('player-joined', {
        playerId: player.id,
        playerToken: player.token,
        gameId: game.id,
        isHost: player.isHost,
        initialGameState: helpers.getSanitizedGameState(game)
    });
    
    helpers.broadcastGameState(io, gameId);
}

export function handleChangeAvatar(io, socket, { gameId, avatar }) {
    const game = manager.getGame(gameId);
    if (!game || game.phase !== 'lobby') return;
    const player = game.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const takenAvatars = game.players.filter(p => p.id !== player.id).map(p => p.avatar);
    if (takenAvatars.includes(avatar)) {
        return socket.emit('error-message', { key: 'avatarTaken', defaultText: "This avatar is already taken.", context: { takenAvatars }, fatal: false });
    }

    player.avatar = avatar;
    helpers.broadcastGameState(io, gameId);
    socket.emit('avatar-changed', { avatar: player.avatar });
}

export function handleChangeName(io, socket, { gameId, newName }) {
    const game = manager.getGame(gameId);
    if (!game || game.phase !== 'lobby') return;
    const player = game.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const trimmedName = (newName || '').trim();
    if (!trimmedName) return;

    const takenNames = game.players.filter(p => p.id !== player.id).map(p => p.name.toLowerCase());
    if (takenNames.includes(trimmedName.toLowerCase())) {
        return socket.emit('error-message', { key: 'nameTaken', defaultText: "This name is already taken.", fatal: false });
    }

    player.name = trimmedName;
    helpers.broadcastGameState(io, gameId);
    socket.emit('name-changed', { name: player.name });
}

export function handleSetTheme(io, socket, { gameId, theme }) {
    const game = manager.getGame(gameId);
    if (game?.phase === 'lobby') {
        game.theme = theme;
        helpers.broadcastGameState(io, gameId);
    }
}

export function handleSetColorTheme(io, socket, { gameId, theme }) {
    const game = manager.getGame(gameId);
    if (game?.phase === 'lobby') {
        game.colorTheme = theme;
        helpers.broadcastGameState(io, gameId);
    }
}

export async function handleSetSillyMode(io, socket, { gameId, sillyMode }) {
    const game = manager.getGame(gameId);
    if (game?.phase === 'lobby') {
        const modeChanged = game.sillyMode !== sillyMode;
        game.sillyMode = sillyMode;
        if (sillyMode) {
            game.is18PlusMode = false;
        }
        
        if (modeChanged) {
            game.theme = '';
            await generateInitialThemes(io, game);
        } else {
            helpers.broadcastGameState(io, gameId);
        }
    }
}

export async function handleReloadThemes(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (game?.phase === 'lobby' && !game.isGeneratingThemes) {
        const now = Date.now();
        const lastReload = game.playerActionCooldowns.get('reload-themes') || 0;
        if (now - lastReload < 1500) return; // 1.5s cooldown to prevent API hammering
        game.playerActionCooldowns.set('reload-themes', now);
        game.theme = '';
        await generateInitialThemes(io, game);
    }
}

export function handleSetSlowpokeMode(io, socket, { gameId, slowpokeMode }) {
    const game = manager.getGame(gameId);
    if (game?.phase === 'lobby') {
        game.slowpokeMode = slowpokeMode;
        helpers.broadcastGameState(io, gameId);
    }
}

export async function handleSet18PlusMode(io, socket, { gameId, is18PlusMode }) {
    const game = manager.getGame(gameId);
    if (game?.phase === 'lobby') {
        const modeChanged = game.is18PlusMode !== is18PlusMode;
        game.is18PlusMode = is18PlusMode;
        if (is18PlusMode) {
            game.sillyMode = false;
        }
        
        if (modeChanged) {
            game.theme = '';
            await generateInitialThemes(io, game);
        } else {
             helpers.broadcastGameState(io, gameId);
        }
    }
}

export function handleStartGame(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (!game) return;
    
    if (game.inactivityTimeoutId) {
        clearTimeout(game.inactivityTimeoutId);
        game.inactivityTimeoutId = null;
    }

    const connectedPlayers = game.players.filter(p => p.socketId).length;
    const canStart = connectedPlayers >= MIN_PLAYERS && connectedPlayers <= MAX_PLAYERS && (game.theme || game.geminiApiErrorCount >= 3);
    
    if (game.phase === 'lobby' && canStart) {
        roundService.startNextRound(io, game);
    }
}

export function handleSendLobbyEmoji(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (!game || game.phase !== 'lobby') return;
    const player = game.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const COOLDOWN_MS = 500;
    const cooldownKey = `emoji-${player.id}`;
    const now = Date.now();
    const lastSent = game.playerActionCooldowns.get(cooldownKey) || 0;

    if (now - lastSent >= COOLDOWN_MS) {
        game.playerActionCooldowns.set(cooldownKey, now);
        if (game.hostDisplaySocketId) {
            io.to(game.hostDisplaySocketId).emit('lobby-emoji-sent', { avatar: player.avatar });
        }
    }
}
