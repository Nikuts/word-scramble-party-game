import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as manager from '../game/manager.js';
import { 
    handleDisconnect, 
    handleReconnectPlayer, 
    handleJoinAsHostDisplay, 
    handleLeaveGame 
} from '../game/handlers/connectionHandlers.js';

describe('Player & Host Disconnect / Reconnect Resiliency', () => {
    let mockIo;
    let game;

    beforeEach(() => {
        // Clear active games
        const activeGames = manager.getGames();
        Object.keys(activeGames).forEach(id => manager.deleteGame(id));

        mockIo = {
            to: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            emit: vi.fn(),
            disconnectSockets: vi.fn()
        };

        // Create a mock active game with 3 players
        game = {
            id: 'RECO',
            hostDisplaySocketId: 'host-socket-001',
            language: 'en',
            phase: 'question',
            phaseTimer: 45,
            phaseEndTime: Date.now() + 45000,
            phaseTimerId: { serverTimeout: 101, broadcastInterval: 102 },
            currentRound: 1,
            isPaused: false,
            players: [
                { id: 'p1', name: 'Alice', token: 'token-alice', socketId: 'socket-alice', isHost: true, score: 300 },
                { id: 'p2', name: 'Bob', token: 'token-bob', socketId: 'socket-bob', isHost: false, score: 200 },
                { id: 'p3', name: 'Charlie', token: 'token-charlie', socketId: 'socket-charlie', isHost: false, score: 100 }
            ],
            playerAnswers: {
                p1: { questions: [{ id: 'q1-p1', text: 'Q1', answer: '' }], submittedAll: false },
                p2: { questions: [{ id: 'q1-p2', text: 'Q2', answer: '' }], submittedAll: false },
                p3: { questions: [{ id: 'q1-p3', text: 'Q3', answer: '' }], submittedAll: false }
            },
            partialAnswers: {
                'q1-p2': 'Partial typed answer from Bob'
            },
            playerReconnectionTimers: {},
            hostReassignmentTimerId: null
        };

        manager.addGame('RECO', game);
    });

    function createMockSocket(socketId, joinedRooms = ['RECO']) {
        return {
            id: socketId,
            rooms: new Set([socketId, ...joinedRooms]),
            join: vi.fn((room) => {}),
            emit: vi.fn()
        };
    }

    describe('Player Disconnection & Timeout Timers', () => {
        it('sets socketId to null and marks player disconnected on disconnect', () => {
            const bobSocket = createMockSocket('socket-bob');
            handleDisconnect(mockIo, bobSocket);

            const bob = game.players.find(p => p.id === 'p2');
            expect(bob.socketId).toBeNull();
            expect(game.playerReconnectionTimers['p2']).toBeDefined();
        });

        it('starts host reassignment timer if the disconnecting player is the lobby host', () => {
            const aliceSocket = createMockSocket('socket-alice');
            handleDisconnect(mockIo, aliceSocket);

            const alice = game.players.find(p => p.id === 'p1');
            expect(alice.socketId).toBeNull();
            expect(game.hostReassignmentTimerId).toBeDefined();
        });

        it('pauses the game timer if all players disconnect mid-game', () => {
            handleDisconnect(mockIo, createMockSocket('socket-alice'));
            handleDisconnect(mockIo, createMockSocket('socket-bob'));
            handleDisconnect(mockIo, createMockSocket('socket-charlie'));

            expect(game.isPaused).toBe(true);
        });
    });

    describe('Player Reconnection with Session Token', () => {
        it('successfully restores player socket, cancels timers, and recovers partial answers', () => {
            // Bob disconnects first
            handleDisconnect(mockIo, createMockSocket('socket-bob'));
            expect(game.players.find(p => p.id === 'p2').socketId).toBeNull();

            // Bob reconnects with a new socket
            const newBobSocket = createMockSocket('new-socket-bob', []);

            handleReconnectPlayer(mockIo, newBobSocket, {
                gameId: 'RECO',
                playerId: 'p2',
                playerToken: 'token-bob'
            });

            const bob = game.players.find(p => p.id === 'p2');
            expect(bob.socketId).toBe('new-socket-bob');
            expect(newBobSocket.join).toHaveBeenCalledWith('RECO');
            expect(newBobSocket.emit).toHaveBeenCalledWith(
                'player-reconnected',
                expect.objectContaining({
                    partialAnswers: {
                        'q1-p2': 'Partial typed answer from Bob'
                    }
                })
            );
            expect(game.playerReconnectionTimers['p2']).toBeUndefined();
        });

        it('resumes a paused game when a player reconnects', () => {
            // Disconnect all to pause
            handleDisconnect(mockIo, createMockSocket('socket-alice'));
            handleDisconnect(mockIo, createMockSocket('socket-bob'));
            handleDisconnect(mockIo, createMockSocket('socket-charlie'));
            expect(game.isPaused).toBe(true);

            // Alice reconnects
            const newAliceSocket = createMockSocket('new-socket-alice', []);

            handleReconnectPlayer(mockIo, newAliceSocket, {
                gameId: 'RECO',
                playerId: 'p1',
                playerToken: 'token-alice'
            });

            expect(game.isPaused).toBe(false);
            expect(game.hostReassignmentTimerId).toBeNull();
        });

        it('rejects reconnection and emits reconnect-failed if token is invalid or game not found', () => {
            const rogueSocket = createMockSocket('socket-rogue', []);

            handleReconnectPlayer(mockIo, rogueSocket, {
                gameId: 'RECO',
                playerId: 'p2',
                playerToken: 'WRONG-TOKEN'
            });

            expect(rogueSocket.emit).toHaveBeenCalledWith('reconnect-failed');
            expect(game.players.find(p => p.id === 'p2').socketId).toBe('socket-bob');
        });
    });

    describe('Host Display Reconnection', () => {
        it('re-attaches hostDisplaySocketId and syncs game state on host reconnect', () => {
            // Host TV disconnects
            handleDisconnect(mockIo, createMockSocket('host-socket-001'));
            expect(game.hostDisplaySocketId).toBeNull();

            // Host TV reconnects
            const newHostSocket = createMockSocket('new-host-socket', []);

            handleJoinAsHostDisplay(mockIo, newHostSocket, { gameId: 'RECO' });

            expect(game.hostDisplaySocketId).toBe('new-host-socket');
            expect(newHostSocket.join).toHaveBeenCalledWith('RECO');
            expect(newHostSocket.emit).toHaveBeenCalledWith(
                'player-reconnected',
                expect.objectContaining({
                    gameState: expect.objectContaining({ id: 'RECO' })
                })
            );
        });
    });

    describe('Explicit Player Leave Game', () => {
        it('removes player immediately and reassigns host if the leaving player was the host', () => {
            handleLeaveGame(mockIo, createMockSocket('socket-alice'), { gameId: 'RECO', playerId: 'p1' });

            expect(game.players.some(p => p.id === 'p1')).toBe(false);
            expect(game.players).toHaveLength(2);
            // Bob (first remaining player) should now be host
            expect(game.players.find(p => p.id === 'p2').isHost).toBe(true);
        });
    });
});
