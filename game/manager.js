// game/manager.js

let games = {}; // Stores all active games { gameId: gameData }
let gcInterval = null;

export const getGames = () => games;
export const getGame = (gameId) => {
    const game = games[gameId];
    if (game) {
        game.lastActivityAt = Date.now();
    }
    return game;
};

export const addGame = (gameId, game) => {
    game.createdAt = game.createdAt || Date.now();
    game.lastActivityAt = game.lastActivityAt || Date.now();
    games[gameId] = game;
};

export const deleteGame = (gameId) => {
    const game = games[gameId];
    if (game) {
        if (game.phaseTimerId) {
            clearTimeout(game.phaseTimerId.serverTimeout);
            clearInterval(game.phaseTimerId.broadcastInterval);
        }
        if (game.hostReassignmentTimerId) {
            clearTimeout(game.hostReassignmentTimerId);
        }
        if (game.playerReconnectionTimers) {
            Object.values(game.playerReconnectionTimers).forEach(t => clearTimeout(t));
        }
        delete games[gameId];
    }
};

/**
 * Finds the game object associated with a given socket.
 * @param {import('socket.io').Socket} socket The socket instance.
 * @returns {object|undefined} The game object or undefined if not found.
 */
export const getGameFromSocket = (socket) => {
    const gameId = Array.from(socket.rooms).find(room => room !== socket.id);
    return getGame(gameId);
};

/**
 * Sweeps and cleans up abandoned games older than maxAgeMs with no active connections.
 * @param {number} maxAgeMs Maximum inactivity period (default 2 hours).
 * @returns {number} The number of games cleaned up.
 */
export const cleanupStaleGames = (maxAgeMs = 2 * 60 * 60 * 1000) => {
    const now = Date.now();
    let cleanedCount = 0;

    Object.entries(games).forEach(([gameId, game]) => {
        const lastActive = game.lastActivityAt || game.createdAt || now;
        const isInactive = (now - lastActive) > maxAgeMs;
        const hasNoConnections = !game.hostDisplaySocketId && (game.players || []).every(p => !p.socketId);

        if (isInactive && hasNoConnections) {
            console.log(`[GC] Cleaning up stale inactive game ${gameId} (Inactive for ${Math.round((now - lastActive) / 60000)}m)`);
            deleteGame(gameId);
            cleanedCount++;
        }
    });

    return cleanedCount;
};

/**
 * Starts periodic room garbage collection.
 * @param {number} intervalMs Sweep interval in milliseconds (default 30 minutes).
 */
export const startGarbageCollector = (intervalMs = 30 * 60 * 1000) => {
    if (gcInterval) clearInterval(gcInterval);
    gcInterval = setInterval(() => {
        cleanupStaleGames();
    }, intervalMs);
    if (gcInterval && typeof gcInterval.unref === 'function') {
        gcInterval.unref(); // Don't hold Node process open solely for GC
    }
};

export const stopGarbageCollector = () => {
    if (gcInterval) {
        clearInterval(gcInterval);
        gcInterval = null;
    }
};
