// game/handlers/connectionHandlers.js
import * as manager from '../manager.js';
import * as gameService from '../services/gameService.js';
import * as timerService from '../services/timerService.js';
import * as battleService from '../services/battleService.js';
import * as helpers from '../helpers.js';
import { generateInitialThemes } from './lobbyHandlers.js';
import {
    PLAYER_RECONNECTION_TIMEOUT,
    HOST_REASSIGNMENT_TIMEOUT_SECONDS,
    PLAYER_AWAY_GRACE_MS
} from '../../src/lib/config.js';

function cleanupRemovedPlayerStateAndAdvance(io, game, removedPlayer) {
    if (!game || !removedPlayer) return false;
    const removedId = removedPlayer.id;
    const removedQuestionIds = new Set(
        (game.playerAnswers?.[removedId]?.questions || []).map(q => q.id)
    );
    if (game.playerAnswers?.[removedId]) {
        delete game.playerAnswers[removedId];
    }
    if (game.reserveQuestions?.[removedId]) {
        delete game.reserveQuestions[removedId];
    }
    if (game.partialAnswers) {
        for (const key of Object.keys(game.partialAnswers)) {
            if (removedQuestionIds.has(key) || (key.startsWith('b-') && key.endsWith(`-${removedId}`))) {
                delete game.partialAnswers[key];
            }
        }
    }

    if (removedPlayer.isHost) {
        helpers.assignHostPlayer(game);
    }

    const connectedPlayers = game.players.filter(p => p.socketId !== null);
    if (connectedPlayers.length === 0) return false;

    if (game.phase === 'question') {
        const connectedParticipating = connectedPlayers.filter(p => game.playerAnswers?.[p.id]);
        if (connectedParticipating.length > 0 && connectedParticipating.every(p => game.playerAnswers[p.id]?.submittedAll)) {
            battleService.prepareBattlePhase(io, game);
            return true;
        }
    } else if (game.phase === 'battle_answering') {
        const connectedIds = new Set(connectedPlayers.map(p => p.id));
        const activeCompetitors = [...new Set((game.battleSchedule || []).flatMap(b => b.competitors || []))]
            .filter(cId => connectedIds.has(cId));
        const allAnswered = activeCompetitors.length > 0 && activeCompetitors.every(cId =>
            (game.battleSchedule || [])
                .filter(b => b.competitors?.includes(cId))
                .every(b => Boolean(b.answers?.[cId]))
        );
        if (allAnswered) {
            battleService.startVotingGetReadyPhase(io, game);
            return true;
        }
    } else if (game.phase === 'battle_voting') {
        const currentBattle = game.battleSchedule?.[game.currentVotingBattleIndex];
        if (currentBattle) {
            const remainingNonCompetitors = game.players.filter(p => !currentBattle.competitors.includes(p.id));
            const eligibleConnectedVoters = remainingNonCompetitors.filter(p => p.socketId !== null);
            const allVoted = (eligibleConnectedVoters.length > 0 && eligibleConnectedVoters.every(p => Boolean(currentBattle.votes?.[p.id])))
                || remainingNonCompetitors.length === 0;
            if (allVoted) {
                io.to(game.id).emit('all-votes-in', { battleId: currentBattle.id });
                battleService.processVoteAndStartReveal(io, game, false);
                return true;
            }
        }
    }
    return false;
}

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
        player.isAway = true;
        stateHasChanged = true;

        if (!game.playerAwayTimers) game.playerAwayTimers = {};
        clearTimeout(game.playerAwayTimers[player.id]);
        game.playerAwayTimers[player.id] = setTimeout(() => {
            const currentGame = manager.getGame(gameId);
            if (currentGame) {
                const target = currentGame.players.find(p => p.id === player.id);
                if (target && !target.socketId && target.isAway) {
                    target.isAway = false;
                    helpers.broadcastGameState(io, gameId);
                }
                if (currentGame.playerAwayTimers) {
                    delete currentGame.playerAwayTimers[player.id];
                }
            }
        }, PLAYER_AWAY_GRACE_MS);

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
                    const [removedPlayer] = currentGame.players.splice(pIndex, 1);
                    if (currentGame.playerReconnectionTimers?.[removedPlayer.id]) {
                        clearTimeout(currentGame.playerReconnectionTimers[removedPlayer.id]);
                        delete currentGame.playerReconnectionTimers[removedPlayer.id];
                    }
                    if (currentGame.playerAwayTimers?.[removedPlayer.id]) {
                        clearTimeout(currentGame.playerAwayTimers[removedPlayer.id]);
                        delete currentGame.playerAwayTimers[removedPlayer.id];
                    }
                    
                    if (currentGame.players.length === 0 && !currentGame.hostDisplaySocketId) {
                        console.log(`[Game ${gameId}] Game is now empty and will be deleted.`);
                        manager.deleteGame(gameId);
                    } else {
                        const advanced = cleanupRemovedPlayerStateAndAdvance(io, currentGame, removedPlayer);
                        if (!advanced) {
                            helpers.broadcastGameState(io, gameId);
                        }
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

        clearTimeout(game.playerReconnectionTimers[playerId]);
        delete game.playerReconnectionTimers[playerId];
        if (game.playerAwayTimers?.[playerId]) {
            clearTimeout(game.playerAwayTimers[playerId]);
            delete game.playerAwayTimers[playerId];
        }

        player.socketId = socket.id;
        player.isAway = false;
        socket.join(gameId);
        helpers.bindSocketToGame(socket, gameId, { playerId: player.id });
        helpers.assignHostPlayer(game);

        if (game.isPaused) {
            timerService.resumeTimer(io, game);
        }
        
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
            gameState: helpers.getSanitizedGameState(game, { role: 'player', playerId: player.id }),
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
        helpers.bindSocketToGame(socket, gameId, { isHostDisplay: true });
        game.hostDisplaySocketId = socket.id;
        socket.emit('player-reconnected', { gameState: helpers.getSanitizedGameState(game, { role: 'hostDisplay' }) });
        helpers.broadcastGameState(io, gameId);
    } else {
        socket.emit('reconnect-failed');
    }
}

export function handleLeaveGame(io, socket, { gameId, playerId }) {
    const game = manager.getGame(gameId);
    if (!game) return;

    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player) return;

    const playerIndex = game.players.findIndex(p => p.id === player.id);
    if (playerIndex > -1) {
        const removedPlayer = game.players.splice(playerIndex, 1)[0];
        if (game.playerReconnectionTimers?.[removedPlayer.id]) {
            clearTimeout(game.playerReconnectionTimers[removedPlayer.id]);
            delete game.playerReconnectionTimers[removedPlayer.id];
        }
        if (game.playerAwayTimers?.[removedPlayer.id]) {
            clearTimeout(game.playerAwayTimers[removedPlayer.id]);
            delete game.playerAwayTimers[removedPlayer.id];
        }
        if (game.players.length === 0) {
            if (game.hostDisplaySocketId) {
                io.to(game.hostDisplaySocketId).emit('all-players-left');
            }
            manager.deleteGame(gameId);
            return;
        }
        const advanced = cleanupRemovedPlayerStateAndAdvance(io, game, removedPlayer);
        if (!advanced) {
            helpers.broadcastGameState(io, gameId);
        }
    }
}

export function handlePlayAgain(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (game && helpers.isHostOrHostDisplay(game, socket)) {
        gameService.resetGameForRestart(game);
        helpers.broadcastGameState(io, gameId);
        generateInitialThemes(io, game);
    }
}

export function handleForceEndGame(io, socket, { gameId }) {
    const game = manager.getGame(gameId);
    if (game && helpers.isHostOrHostDisplay(game, socket)) {
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
