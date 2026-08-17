// test/timeBoostAndLobbyEnhancements.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as manager from '../game/manager.js';
import * as lobbyHandlers from '../game/handlers/lobbyHandlers.js';
import * as gameplayHandlers from '../game/handlers/gameplayHandlers.js';
import * as timerService from '../game/services/timerService.js';
import * as gameService from '../game/services/gameService.js';
import * as helpers from '../game/helpers.js';

describe('Time Boost & Lobby Enhancements', () => {
    let io;
    let socket;
    let game;

    beforeEach(() => {
        io = {
            to: vi.fn().mockReturnThis(),
            emit: vi.fn(),
        };
        socket = {
            id: 'socket-host-1',
            emit: vi.fn(),
            join: vi.fn(),
        };

        Object.keys(manager.getGames()).forEach(id => {
            manager.deleteGame(id);
        });
        game = {
            id: 'TEST',
            language: 'en',
            phase: 'lobby',
            players: [
                { id: 'p1', name: 'Alice', socketId: 'socket-host-1', isHost: true, score: 0, avatar: 'avatar_1', hasUsedTimeBoost: false },
                { id: 'p2', name: 'Bob', socketId: 'socket-p2', isHost: false, score: 0, avatar: 'avatar_2', hasUsedTimeBoost: false },
                { id: 'p3', name: 'Charlie', socketId: 'socket-p3', isHost: false, score: 0, avatar: 'avatar_3', hasUsedTimeBoost: false },
            ],
            playerAnswers: {},
            battleSchedule: [],
            currentRound: 1,
            playerActionCooldowns: new Map(),
            geminiApiErrorCount: 0,
            sillyMode: false,
            is18PlusMode: false,
            theme: '',
        };
        manager.addGame('TEST', game);
    });

    describe('Lobby Topic Reload & Silly Mode', () => {
        it('allows reloading lobby topics when not already generating', async () => {
            game.preGeneratedThemes = { en: ['Old 1', 'Old 2'], uk: ['Стара 1', 'Стара 2'] };
            await lobbyHandlers.handleReloadThemes(io, socket, { gameId: 'TEST' });

            expect(game.preGeneratedThemes).toBeDefined();
            expect(game.isGeneratingThemes).toBe(false);
        });

        it('re-generates themes when Silly Mode is toggled', async () => {
            game.theme = 'Selected Custom Theme';
            await lobbyHandlers.handleSetSillyMode(io, socket, { gameId: 'TEST', sillyMode: true });

            expect(game.sillyMode).toBe(true);
            expect(game.is18PlusMode).toBe(false);
            expect(game.theme).toBe(''); // Reset theme selection to allow fresh choices
        });
    });

    describe('Time Boost Feature (1 per game)', () => {
        it('extends phase timer by 30 seconds in question phase and marks token used', () => {
            game.phase = 'question';
            const now = Date.now();
            game.phaseEndTime = now + 40000; // 40s left

            gameplayHandlers.handleUseTimeBoost(io, socket, { gameId: 'TEST', playerId: 'p1' });

            expect(game.players[0].hasUsedTimeBoost).toBe(true);
            // Check timer extended (approx 40 + 30 = 70s from now)
            const remaining = Math.round((game.phaseEndTime - Date.now()) / 1000);
            expect(remaining).toBeGreaterThanOrEqual(68);
            expect(remaining).toBeLessThanOrEqual(72);

            expect(io.to).toHaveBeenCalledWith('TEST');
            expect(io.emit).toHaveBeenCalledWith('time-boost-used', expect.objectContaining({
                playerId: 'p1',
                playerName: 'Alice',
                phase: 'question'
            }));
        });

        it('extends phase timer in battle_answering phase', () => {
            game.phase = 'battle_answering';
            const now = Date.now();
            game.phaseEndTime = now + 30000; // 30s left

            gameplayHandlers.handleUseTimeBoost(io, socket, { gameId: 'TEST', playerId: 'p2' });

            expect(game.players[1].hasUsedTimeBoost).toBe(true);
            const remaining = Math.round((game.phaseEndTime - Date.now()) / 1000);
            expect(remaining).toBeGreaterThanOrEqual(58);
            expect(remaining).toBeLessThanOrEqual(62);
        });

        it('strictly blocks player from using more than 1 time boost per game', () => {
            game.phase = 'question';
            game.phaseEndTime = Date.now() + 40000;

            // First use
            gameplayHandlers.handleUseTimeBoost(io, socket, { gameId: 'TEST', playerId: 'p1' });
            expect(game.players[0].hasUsedTimeBoost).toBe(true);

            const timerAfterFirst = game.phaseEndTime;

            // Second use attempt by same player
            gameplayHandlers.handleUseTimeBoost(io, socket, { gameId: 'TEST', playerId: 'p1' });
            expect(game.phaseEndTime).toBe(timerAfterFirst); // Unchanged
        });

        it('resets hasUsedTimeBoost flag for all players when game is restarted', () => {
            game.players[0].hasUsedTimeBoost = true;
            game.players[1].hasUsedTimeBoost = true;

            gameService.resetGameForRestart(game);

            expect(game.players[0].hasUsedTimeBoost).toBe(false);
            expect(game.players[1].hasUsedTimeBoost).toBe(false);
        });

        it('includes hasUsedTimeBoost in sanitized game state for clients', () => {
            game.players[0].hasUsedTimeBoost = true;
            const sanitized = helpers.getSanitizedGameState(game);
            
            expect(sanitized.players[0].hasUsedTimeBoost).toBe(true);
            expect(sanitized.players[1].hasUsedTimeBoost).toBe(false);
        });

        it('ignores time boost attempts during non-answering phases (e.g. voting)', () => {
            game.phase = 'battle_voting';
            game.phaseEndTime = Date.now() + 30000;

            gameplayHandlers.handleUseTimeBoost(io, socket, { gameId: 'TEST', playerId: 'p3' });

            expect(game.players[2].hasUsedTimeBoost).toBe(false);
        });
    });
});
