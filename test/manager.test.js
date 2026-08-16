import { describe, it, expect, beforeEach } from 'vitest';
import { getGames, getGame, addGame, deleteGame } from '../game/manager.js';

describe('Game State Manager', () => {
    beforeEach(() => {
        // Clear active games before each test
        const allGames = getGames();
        Object.keys(allGames).forEach(id => deleteGame(id));
    });

    it('should add, retrieve, and delete active games', () => {
        expect(Object.keys(getGames()).length).toBe(0);

        const mockGame = { id: 'GAME1', phase: 'lobby', players: [] };
        addGame('GAME1', mockGame);

        expect(getGame('GAME1')).toEqual(mockGame);
        expect(Object.keys(getGames())).toHaveLength(1);

        deleteGame('GAME1');
        expect(getGame('GAME1')).toBeUndefined();
        expect(Object.keys(getGames())).toHaveLength(0);
    });
});
