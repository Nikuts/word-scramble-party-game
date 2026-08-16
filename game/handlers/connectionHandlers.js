// game/handlers/connectionHandlers.js
import * as manager from '../manager.js';
import * as gameService from '../services/gameService.js';
import * as timerService from '../services/timerService.js';
import * as helpers from '../helpers.js';
import { generateInitialThemes } from './lobbyHandlers.js';
import {
    PLAYER_RECONNECTION_TIMEOUT,
    HOST_REASSIGNMENT_TIMEOUT_SECONDS
} from '../../src/lib/config.js';

export function handleDisconnect(io, socket) {
    const game = manager.getGameFromSocket(socket);

    if (!game) return;

    let stateHasChanged = false;
    const gameId = game.id;

    if (game.hostDisplaySocketId === socket.id) {
        console.log(`[Game ${gameId}] Host Display disconnected. Awaiting reconnect.`);
        game.hostDisplaySocketId = null;
        stateHasChanged = true;
    }

    const player = game.players.find(p => p.socketId === socket.id);
    if (player) {
        console.log(`[Game ${gameId}] Player ${player.name} disconnected.`);
        player.socketId = null;
        stateHasChanged = true;

        if (player.isHost) {
            console.log(`[Game ${gameId}] Host ${player.name} disconnected. Starting ${HOST_REASSIGNMENT_TIMEOUT_SECONDS}s reassignment timer.`);
            clearTimeout(game.hostReassignmentTimerId);
            game.hostReassignmentTimerId = setTimeout(() => {
                const currentGame = manager.getGame(gameId);
                if (currentGame) {
                    const disconnectedHost = currentGame.players.find(p => p.id === player.id);
                    if (disconnectedHost && !disconnectedHost.socketId) {
                        console.log(`[Game ${gameId}] Host reassignment timer fired. Assigning new host.`);
                        helpers.assignHostPlayer(currentGame);
                        helpers.broadcastGameState(io, gameId);
                    }
                    currentGame.hostReassignmentTimerId = null;
                }
            }, HOST_REASSIGNMENT_TIMEOUT_SECONDS * 1000);
        }

        const connectedPlayers = game.players.filter(p => p.socketId);
        if (connectedPlayers.length === 0 && game.phase !== 'lobby' && game.phase !== 'results') {
            timerService.pauseTimer(game);
        }

        clearTimeout(game.playerReconnectionTimers[player.id]);
        game.playerReconnectionTimers[player.id] = setTimeout(() => {
            const currentGame = manager.getGame(gameId);
            if (currentGame) {
                const pIndex = currentGame.players.findIndex(p => p.id === player.id);
                if (pIndex > -1 && !currentGame.players[pIndex].socketId) {
                    console.log(`[Game ${gameId}] Player ${player.name} timed out. Removing from game.`);
                    currentGame.players.splice(pIndex, 1);
                    
                    if (currentGame.players.length === 0 && !currentGame.hostDisplaySocketId) {
                        console.log(`[Game ${gameId}] Game is now empty and will be deleted.`);
                        manager.deleteGame(gameId);
                    } else {
                        helpers.assignHostPlayer(currentGame);
                        helpers.broadcastGameState(io, gameId);
                    }
                }
            }
        }, PLAYER_RECONNECTION_TIMEOUT);
    }

    if (stateHasChanged) {
        helpers.broadcastGameState(io, gameId);
    }
}

export function handleReconnectPlayer(io, socket, { gameId, playerId, playerToken }) {
    const game = manager.getGame(gameId);
    const player = game?.players.find(p => p.id === playerId);

    if (game && player && player.token === playerToken) {
        if (!game.playerReconnectionTimers) game.playerReconnectionTimers = {};

        if (game.hostReassignmentTimerId && player.isHost) {
            console.log(`[Game ${game.id}] Host ${player.name} reconnected. Cancelling host reassignment.`);
            clearTimeout(game.hostReassignmentTimerId);
            game.hostReassignmentTimerId = null;
        }

        if (game.isPaused) {
            timerService.resumeTimer(io, game);
        }

        clearTimeout(game.playerReconnectionTimers[playerId]);
        delete game.playerReconnectionTimers[playerId];

        player.socketId = socket.id;
        socket.join(gameId);
        if (socket) {
            socket.data = socket.data || {};
            socket.data.gameId = gameId;
        }
        helpers.assignHostPlayer(game);
        
        const partialAnswersForPlayer = {};
        if (game.playerAnswers) {
            const playerQuestions = game.playerAnswers[playerId]?.questions || [];
            playerQuestions.forEach(q => {
                if (game.partialAnswers[q.id]) partialAnswersForPlayer[q.id] = game.partialAnswers[q.id];
            });
        }
        if (game.battleSchedule) {
            game.battleSchedule.forEach(battle => {
                if (battle.competitors.includes(playerId)) {
                     const key = `b-${battle.id}-${playerId}`;
                     if(game.partialAnswers[key]) partialAnswersForPlayer[key] = game.partialAnswers[key];
                }
            });
        }

        socket.emit('player-reconnected', { 
            gameState: helpers.getSanitizedGameState(game),
            partialAnswers: partialAnswersForPlayer 
        });
        helpers.broadcastGameState(io, gameId);
    } else {
        socket.emit('reconnect-failed');
    }
}

export function handleJoinAsHostDisplay(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (game) {
        socket.join(gameId);
        if (socket) {
            socket.data = socket.data || {};
            socket.data.gameId = gameId;
        }
        game.hostDisplaySocketId = socket.id;
        socket.emit('player-reconnected', { gameState: helpers.getSanitizedGameState(game) });
        helpers.broadcastGameState(io, gameId);
    } else {
        socket.emit('reconnect-failed');
    }
}

export function handleLeaveGame(io, socket, { gameId, playerId }) {
    const game = manager.getGame(gameId);
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex > -1) {
        const removedPlayer = game.players.splice(playerIndex, 1)[0];
        if (game.playerReconnectionTimers?.[removedPlayer.id]) {
            clearTimeout(game.playerReconnectionTimers[removedPlayer.id]);
            delete game.playerReconnectionTimers[removedPlayer.id];
        }
        if (removedPlayer.isHost) helpers.assignHostPlayer(game);
        helpers.broadcastGameState(io, gameId);
        if (game.players.length === 0 && game.hostDisplaySocketId) {
             io.to(game.hostDisplaySocketId).emit('all-players-left');
             manager.deleteGame(gameId);
        }
    }
}

export function handlePlayAgain(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    const player = game?.players.find(p => p.socketId === socket.id);

    if (game && player && player.isHost) {
        gameService.resetGameForRestart(game);
        helpers.broadcastGameState(io, gameId);
        generateInitialThemes(io, game);
    }
}

export function handleForceEndGame(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (game && (game.hostDisplaySocketId === socket.id || game.players.find(p => p.socketId === socket.id)?.isHost)) {
        timerService.clearPhaseTimer(game);
        console.log(`[Game ${gameId}] Game end requested. Timers cleared.`);

        io.to(gameId).emit('game-force-ended');
        
        setTimeout(() => {
            io.in(gameId).disconnectSockets(true);
            manager.deleteGame(gameId);
            console.log(`[Game ${gameId}] Game forcefully ended and deleted.`);
        }, 500);
    }
}
