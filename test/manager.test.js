import { describe, it, expect, beforeEach } from 'vitest';
import { getGames, getGame, addGame, deleteGame, cleanupStaleGames } from '../game/manager.js';

describe('Game State Manager & Garbage Collection', () => {
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

    it('should clean up inactive stale games without active connections', () => {
        const now = Date.now();
        const activeGame = {
            id: 'ACTIVE',
            createdAt: now,
            lastActivityAt: now,
            hostDisplaySocketId: 'sock-host',
            players: [{ id: 'p1', socketId: 'sock-1' }]
        };
        const staleGame = {
            id: 'STALE',
            createdAt: now - (3 * 60 * 60 * 1000), // 3 hours old
            lastActivityAt: now - (3 * 60 * 60 * 1000),
            hostDisplaySocketId: null,
            players: [{ id: 'p2', socketId: null }]
        };

        addGame('ACTIVE', activeGame);
        addGame('STALE', staleGame);
        expect(Object.keys(getGames())).toHaveLength(2);

        const cleaned = cleanupStaleGames(2 * 60 * 60 * 1000);
        expect(cleaned).toBe(1);
        expect(getGame('ACTIVE')).toBeDefined();
        expect(getGame('STALE')).toBeUndefined();
    });
});
