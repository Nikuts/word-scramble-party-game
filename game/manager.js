// game/manager.js

let games = {}; // Stores all active games { gameId: gameData }

export const getGames = () => games;
export const getGame = (gameId) => games[gameId];
export const addGame = (gameId, game) => { games[gameId] = game; };
export const deleteGame = (gameId) => { delete games[gameId]; };

/**
 * Finds the game object associated with a given socket.
 * @param {import('socket.io').Socket} socket The socket instance.
 * @returns {object|undefined} The game object or undefined if not found.
 */
export const getGameFromSocket = (socket) => {
    const gameId = Array.from(socket.rooms).find(room => room !== socket.id);
    return getGame(gameId);
};
