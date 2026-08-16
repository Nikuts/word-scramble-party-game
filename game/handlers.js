// game/handlers.js
import * as schemas from './validationSchemas.js';
import { withValidation } from './handlers/validation.js';
import {
    handleCreateGame,
    handleJoinGame,
    handleSetTheme,
    handleSetColorTheme,
    handleSetSillyMode,
    handleSetSlowpokeMode,
    handleSet18PlusMode,
    handleStartGame,
    handleSendLobbyEmoji
} from './handlers/lobbyHandlers.js';
import {
    handleDisconnect,
    handleReconnectPlayer,
    handleJoinAsHostDisplay,
    handleLeaveGame,
    handlePlayAgain,
    handleForceEndGame
} from './handlers/connectionHandlers.js';
import {
    handleSubmitAnswer,
    handleUpdatePartialAnswer,
    handleSubmitBattleAnswer,
    handleVote
} from './handlers/gameplayHandlers.js';

export { withValidation };

/**
 * Registers all Socket.IO event listeners on the incoming socket connection.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerEventHandlers(io, socket) {
    // Session & Connection
    socket.on('create-game', withValidation(schemas.createGameSchema, handleCreateGame.bind(socket)));
    socket.on('join-game', withValidation(schemas.joinGameSchema, handleJoinGame.bind(socket)));
    socket.on('disconnect', () => handleDisconnect(io, socket));
    socket.on('reconnect-player', withValidation(schemas.reconnectPlayerSchema, handleReconnectPlayer.bind(socket)));
    socket.on('join-as-host-display', withValidation(schemas.gameIdSchema, handleJoinAsHostDisplay.bind(socket)));
    
    // Lobby and game setup
    socket.on('set-theme', withValidation(schemas.setThemeSchema, handleSetTheme.bind(socket)));
    socket.on('set-color-theme', withValidation(schemas.setColorThemeSchema, handleSetColorTheme.bind(socket)));
    socket.on('set-silly-mode', withValidation(schemas.setBooleanOptionSchema('sillyMode'), handleSetSillyMode.bind(socket)));
    socket.on('set-slowpoke-mode', withValidation(schemas.setBooleanOptionSchema('slowpokeMode'), handleSetSlowpokeMode.bind(socket)));
    socket.on('set-18plus-mode', withValidation(schemas.setBooleanOptionSchema('is18PlusMode'), handleSet18PlusMode.bind(socket)));
    socket.on('start-game', withValidation(schemas.gameIdSchema, handleStartGame.bind(socket)));
    
    // In-game actions
    socket.on('submit-answer', withValidation(schemas.submitAnswerSchema, handleSubmitAnswer.bind(socket)));
    socket.on('update-partial-answer', withValidation(schemas.updatePartialAnswerSchema, handleUpdatePartialAnswer.bind(socket)));
    socket.on('submit-battle-answer', withValidation(schemas.submitBattleAnswerSchema, handleSubmitBattleAnswer.bind(socket)));
    socket.on('vote', withValidation(schemas.voteSchema, handleVote.bind(socket)));
    
    // Game management
    socket.on('leave-game', withValidation(schemas.playerAndGameIdSchema, handleLeaveGame.bind(socket)));
    socket.on('play-again', withValidation(schemas.gameIdSchema, handlePlayAgain.bind(socket)));
    socket.on('force-end-game', withValidation(schemas.gameIdSchema, handleForceEndGame.bind(socket)));
    
    // Interactive / Fun
    socket.on('send-lobby-emoji', withValidation(schemas.gameIdSchema, handleSendLobbyEmoji.bind(socket)));
}
