import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as manager from '../game/manager.js';
import { handleSendLobbyEmoji } from '../game/handlers/lobbyHandlers.js';
import { sendReactionSchema } from '../game/validationSchemas.js';

describe('Player Reaction Emojis System', () => {
    let io;
    let socket;
    let mockHostEmit;
    let game;

    beforeEach(() => {
        // Clear existing games
        Object.keys(manager.getGames()).forEach(id => manager.deleteGame(id));

        mockHostEmit = vi.fn();
        io = {
            to: vi.fn((targetSocketId) => ({
                emit: mockHostEmit
            }))
        };

        socket = {
            id: 'socket-alice',
            emit: vi.fn()
        };

        // Create test game
        game = {
            id: 'TEST',
            phase: 'lobby',
            hostDisplaySocketId: 'host-socket-123',
            playerActionCooldowns: new Map(),
            players: [
                {
                    id: 'player-alice',
                    name: 'Alice',
                    socketId: 'socket-alice',
                    avatar: '👽',
                    score: 100
                },
                {
                    id: 'player-bob',
                    name: 'Bob',
                    socketId: 'socket-bob',
                    avatar: '🦊',
                    score: 50
                }
            ]
        };
        manager.addGame('TEST', game);
    });

    it('validates sendReactionSchema correctly for emoji and avatar reactions', () => {
        const validWithEmoji = sendReactionSchema.safeParse({
            gameId: 'TEST',
            emoji: '🔥'
        });
        expect(validWithEmoji.success).toBe(true);
        expect(validWithEmoji.data.emoji).toBe('🔥');

        const validWithoutEmoji = sendReactionSchema.safeParse({
            gameId: 'TEST'
        });
        expect(validWithoutEmoji.success).toBe(true);
        expect(validWithoutEmoji.data.emoji).toBeUndefined();

        const invalidGameId = sendReactionSchema.safeParse({
            gameId: '123' // Too short
        });
        expect(invalidGameId.success).toBe(false);
    });

    it('broadcasts reaction emoji and avatar to host display during lobby phase', () => {
        game.phase = 'lobby';
        handleSendLobbyEmoji(io, socket, { gameId: 'TEST', emoji: '🔥' });

        expect(io.to).toHaveBeenCalledWith('host-socket-123');
        expect(mockHostEmit).toHaveBeenCalledWith('lobby-emoji-sent', {
            avatar: '👽',
            emoji: '🔥',
            playerName: 'Alice'
        });
    });

    it('broadcasts reaction emoji to host display during battle_voting phase', () => {
        game.phase = 'battle_voting';
        handleSendLobbyEmoji(io, socket, { gameId: 'TEST', emoji: '😂' });

        expect(io.to).toHaveBeenCalledWith('host-socket-123');
        expect(mockHostEmit).toHaveBeenCalledWith('lobby-emoji-sent', {
            avatar: '👽',
            emoji: '😂',
            playerName: 'Alice'
        });
    });

    it('broadcasts reaction emoji to host display during battle_result_reveal and game_over phases', () => {
        game.phase = 'battle_result_reveal';
        handleSendLobbyEmoji(io, socket, { gameId: 'TEST', emoji: '👏' });

        expect(mockHostEmit).toHaveBeenCalledWith('lobby-emoji-sent', {
            avatar: '👽',
            emoji: '👏',
            playerName: 'Alice'
        });

        // Advance to game_over (after cooldown)
        game.phase = 'game_over';
        game.playerActionCooldowns.set('emoji-player-alice', 0);
        handleSendLobbyEmoji(io, socket, { gameId: 'TEST', emoji: '🌈' });

        expect(mockHostEmit).toHaveBeenCalledWith('lobby-emoji-sent', {
            avatar: '👽',
            emoji: '🌈',
            playerName: 'Alice'
        });
    });

    it('enforces spam cooldown per player', () => {
        game.phase = 'battle_voting';
        handleSendLobbyEmoji(io, socket, { gameId: 'TEST', emoji: '💀' });
        expect(mockHostEmit).toHaveBeenCalledTimes(1);

        // Immediate second click within cooldown should be ignored
        handleSendLobbyEmoji(io, socket, { gameId: 'TEST', emoji: '💀' });
        expect(mockHostEmit).toHaveBeenCalledTimes(1);
    });

    it('safely ignores requests from non-existent players or missing games', () => {
        const unknownSocket = { id: 'unknown-socket' };
        handleSendLobbyEmoji(io, unknownSocket, { gameId: 'TEST', emoji: '🔥' });
        expect(mockHostEmit).not.toHaveBeenCalled();

        handleSendLobbyEmoji(io, socket, { gameId: 'NON_EXISTENT', emoji: '🔥' });
        expect(mockHostEmit).not.toHaveBeenCalled();
    });
});
