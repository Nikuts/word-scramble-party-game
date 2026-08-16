import { describe, it, expect, beforeEach } from 'vitest';
import * as manager from '../game/manager.js';
import * as helpers from '../game/helpers.js';
import { handleCreateGame, handleJoinGame } from '../game/handlers/lobbyHandlers.js';
import { handleSubmitAnswer } from '../game/handlers/gameplayHandlers.js';

describe('Multi-Game Concurrency & Session Isolation', () => {
    beforeEach(() => {
        const allGames = manager.getGames();
        Object.keys(allGames).forEach(id => manager.deleteGame(id));
    });

    it('runs multiple independent games simultaneously without state bleed', async () => {
        const mockIo = {
            to: (roomId) => ({
                emit: (event, payload) => {}
            }),
            in: (roomId) => ({
                disconnectSockets: () => {}
            })
        };

        const hostSocket1 = { id: 'host-sock-1', join: () => {}, emit: () => {}, data: {} };
        const hostSocket2 = { id: 'host-sock-2', join: () => {}, emit: () => {}, data: {} };

        // Create Game 1 (English) and Game 2 (Ukrainian)
        await handleCreateGame(mockIo, hostSocket1, { language: 'en' });
        await handleCreateGame(mockIo, hostSocket2, { language: 'uk' });

        const games = manager.getGames();
        const gameIds = Object.keys(games);
        expect(gameIds).toHaveLength(2);

        const [gId1, gId2] = gameIds;
        expect(gId1).not.toBe(gId2);

        const game1 = manager.getGame(gId1);
        const game2 = manager.getGame(gId2);

        expect(game1.language).toBe('en');
        expect(game2.language).toBe('uk');

        // Add players to Game 1
        const p1Socket = { id: 'p1-sock', join: () => {}, emit: () => {}, data: {} };
        handleJoinGame(mockIo, p1Socket, { gameId: gId1, playerName: 'Alice', language: 'en', avatar: '🐱' });

        // Add players to Game 2
        const p2Socket = { id: 'p2-sock', join: () => {}, emit: () => {}, data: {} };
        handleJoinGame(mockIo, p2Socket, { gameId: gId2, playerName: 'Богдан', language: 'uk', avatar: '🐱' });

        // Both games can have players with same avatar/index in their respective isolated rooms
        expect(game1.players).toHaveLength(1);
        expect(game2.players).toHaveLength(1);
        expect(game1.players[0].name).toBe('Alice');
        expect(game2.players[0].name).toBe('Богдан');

        // Transition Game 1 to question phase while Game 2 remains in lobby
        game1.phase = 'question';
        game1.currentRound = 1;
        game1.playerAnswers = {
            [game1.players[0].id]: {
                questions: [
                    { id: 'q1', text: 'Why is pizza round?', answer: '' },
                    { id: 'q2', text: 'What is the secret of life?', answer: '' }
                ],
                submittedAll: false,
                rerollsLeft: 1
            }
        };

        expect(game1.phase).toBe('question');
        expect(game2.phase).toBe('lobby');

        // Answer question 1 in Game 1
        handleSubmitAnswer(mockIo, p1Socket, {
            gameId: gId1,
            playerId: game1.players[0].id,
            questionId: 'q1',
            answer: 'Because squares are too edgy'
        });

        expect(game1.playerAnswers[game1.players[0].id].questions[0].answer).toBe('Because squares are too edgy');
        expect(game1.playerAnswers[game1.players[0].id].questions[1].answer).toBe('');
        // Game 2 playerAnswers must remain unaffected
        expect(game2.playerAnswers).toEqual({});
    });

    it('performs O(1) socket room lookups via socket.data.gameId', () => {
        const mockSocket = {
            id: 'sock-123',
            data: { gameId: 'FAST' },
            rooms: new Set(['sock-123', 'FAST'])
        };

        const mockGame = { id: 'FAST', phase: 'lobby', players: [] };
        manager.addGame('FAST', mockGame);

        const foundGame = manager.getGameFromSocket(mockSocket);
        expect(foundGame).toBeDefined();
        expect(foundGame.id).toBe('FAST');
    });
});
