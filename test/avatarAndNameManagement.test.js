import { describe, it, expect, beforeEach } from 'vitest';
import * as manager from '../game/manager.js';
import { handleCreateGame, handleJoinGame, handleChangeAvatar, handleChangeName } from '../game/handlers/lobbyHandlers.js';
import { AVATARS } from '../src/lib/config.js';

describe('Avatar & Name Management in Lobby', () => {
    let mockIo;
    let mockSocketHost;
    let mockSocketP1;
    let mockSocketP2;
    let gameId;

    beforeEach(async () => {
        // Clear all games
        Object.keys(manager.getGames()).forEach(id => {
            manager.deleteGame(id);
        });

        mockIo = {
            to: (room) => ({
                emit: (event, payload) => {}
            }),
            in: (room) => ({
                disconnectSockets: () => {}
            })
        };

        // Create host
        mockSocketHost = {
            id: 'socket_host',
            join: (room) => {},
            emit: (event, payload) => {
                if (event === 'game-created') {
                    gameId = payload.gameId;
                }
            }
        };

        await handleCreateGame(mockIo, mockSocketHost, { language: 'en' });
    });

    it('auto-assigns the first available avatar when a player joins without specifying an avatar', () => {
        let p1Payload = null;
        mockSocketP1 = {
            id: 'socket_p1',
            join: () => {},
            emit: (event, payload) => {
                if (event === 'player-joined') p1Payload = payload;
            }
        };

        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

        const game = manager.getGame(gameId);
        expect(game.players).toHaveLength(1);
        expect(game.players[0].name).toBe('Alice');
        expect(game.players[0].avatar).toBe(AVATARS[0]); // '👽'
    });

    it('auto-assigns distinct consecutive available avatars to sequential joiners', () => {
        const joinedPlayers = [];
        for (let i = 0; i < 5; i++) {
            const socket = {
                id: `socket_${i}`,
                join: () => {},
                emit: (event, payload) => {
                    if (event === 'player-joined') joinedPlayers.push(payload);
                }
            };
            handleJoinGame(mockIo, socket, { gameId, playerName: `Player_${i + 1}`, language: 'en' });
        }

        const game = manager.getGame(gameId);
        expect(game.players).toHaveLength(5);
        expect(game.players[0].avatar).toBe(AVATARS[0]);
        expect(game.players[1].avatar).toBe(AVATARS[1]);
        expect(game.players[2].avatar).toBe(AVATARS[2]);
        expect(game.players[3].avatar).toBe(AVATARS[3]);
        expect(game.players[4].avatar).toBe(AVATARS[4]);
    });

    it('auto-assigns the next unselected avatar even if a player attempts to join with an already-taken avatar', () => {
        mockSocketP1 = {
            id: 'socket_p1',
            join: () => {},
            emit: () => {}
        };
        // Alice joins with AVATARS[0]
        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en', avatar: AVATARS[0] });

        mockSocketP2 = {
            id: 'socket_p2',
            join: () => {},
            emit: () => {}
        };
        // Bob tries to join with AVATARS[0] (which is taken)
        handleJoinGame(mockIo, mockSocketP2, { gameId, playerName: 'Bob', language: 'en', avatar: AVATARS[0] });

        const game = manager.getGame(gameId);
        expect(game.players).toHaveLength(2);
        expect(game.players[0].avatar).toBe(AVATARS[0]);
        expect(game.players[1].avatar).toBe(AVATARS[1]); // Auto-reassigned to next free avatar
    });

    it('allows a player to change their avatar in the lobby to an available one', () => {
        let avatarChangedPayload = null;
        mockSocketP1 = {
            id: 'socket_p1',
            join: () => {},
            emit: (event, payload) => {
                if (event === 'avatar-changed') avatarChangedPayload = payload;
            }
        };
        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

        const game = manager.getGame(gameId);
        expect(game.players[0].avatar).toBe(AVATARS[0]);

        // Alice changes avatar to AVATARS[5]
        handleChangeAvatar(mockIo, mockSocketP1, { gameId, avatar: AVATARS[5] });

        expect(game.players[0].avatar).toBe(AVATARS[5]);
        expect(avatarChangedPayload).toEqual({ avatar: AVATARS[5] });
    });

    it('rejects changing avatar if another connected player already has it', () => {
        let p2Error = null;
        mockSocketP1 = { id: 'socket_p1', join: () => {}, emit: () => {} };
        mockSocketP2 = {
            id: 'socket_p2',
            join: () => {},
            emit: (event, payload) => {
                if (event === 'error-message') p2Error = payload;
            }
        };

        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en', avatar: AVATARS[0] });
        handleJoinGame(mockIo, mockSocketP2, { gameId, playerName: 'Bob', language: 'en', avatar: AVATARS[1] });

        // Bob tries to change avatar to AVATARS[0] (Alice's avatar)
        handleChangeAvatar(mockIo, mockSocketP2, { gameId, avatar: AVATARS[0] });

        const game = manager.getGame(gameId);
        expect(game.players[1].avatar).toBe(AVATARS[1]); // Unchanged
        expect(p2Error).toBeTruthy();
        expect(p2Error.key).toBe('avatarTaken');
    });

    it('allows a player to redact/edit their name in the lobby', () => {
        let nameChangedPayload = null;
        mockSocketP1 = {
            id: 'socket_p1',
            join: () => {},
            emit: (event, payload) => {
                if (event === 'name-changed') nameChangedPayload = payload;
            }
        };

        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

        const game = manager.getGame(gameId);
        expect(game.players[0].name).toBe('Alice');

        // Alice renames to "Super Alice"
        handleChangeName(mockIo, mockSocketP1, { gameId, newName: 'Super Alice' });

        expect(game.players[0].name).toBe('Super Alice');
        expect(nameChangedPayload).toEqual({ name: 'Super Alice' });
    });

    it('rejects changing name if another connected player already has that name (case-insensitive)', () => {
        let p2Error = null;
        mockSocketP1 = { id: 'socket_p1', join: () => {}, emit: () => {} };
        mockSocketP2 = {
            id: 'socket_p2',
            join: () => {},
            emit: (event, payload) => {
                if (event === 'error-message') p2Error = payload;
            }
        };

        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });
        handleJoinGame(mockIo, mockSocketP2, { gameId, playerName: 'Bob', language: 'en' });

        // Bob tries to rename to "alice"
        handleChangeName(mockIo, mockSocketP2, { gameId, newName: 'alice' });

        const game = manager.getGame(gameId);
        expect(game.players[1].name).toBe('Bob'); // Unchanged
        expect(p2Error).toBeTruthy();
        expect(p2Error.key).toBe('nameTaken');
    });

    it('ignores avatar and name change attempts after the lobby phase has passed', () => {
        mockSocketP1 = { id: 'socket_p1', join: () => {}, emit: () => {} };
        handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

        const game = manager.getGame(gameId);
        game.phase = 'questions'; // Game has started

        handleChangeAvatar(mockIo, mockSocketP1, { gameId, avatar: AVATARS[9] });
        handleChangeName(mockIo, mockSocketP1, { gameId, newName: 'New Alice' });

        expect(game.players[0].avatar).toBe(AVATARS[0]);
        expect(game.players[0].name).toBe('Alice');
    });

    describe('Edge Cases', () => {
        it('allows a player to update casing of their own name without self-collision', () => {
            let nameChangedPayload = null;
            mockSocketP1 = {
                id: 'socket_p1',
                join: () => {},
                emit: (event, payload) => {
                    if (event === 'name-changed') nameChangedPayload = payload;
                }
            };
            handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

            handleChangeName(mockIo, mockSocketP1, { gameId, newName: 'ALICE' });

            const game = manager.getGame(gameId);
            expect(game.players[0].name).toBe('ALICE');
            expect(nameChangedPayload).toEqual({ name: 'ALICE' });
        });

        it('trims leading/trailing whitespace when updating name', () => {
            mockSocketP1 = { id: 'socket_p1', join: () => {}, emit: () => {} };
            handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

            handleChangeName(mockIo, mockSocketP1, { gameId, newName: '   Wonderland   ' });

            const game = manager.getGame(gameId);
            expect(game.players[0].name).toBe('Wonderland');
        });

        it('ignores empty or whitespace-only name updates without altering existing name', () => {
            mockSocketP1 = { id: 'socket_p1', join: () => {}, emit: () => {} };
            handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en' });

            handleChangeName(mockIo, mockSocketP1, { gameId, newName: '    ' });
            handleChangeName(mockIo, mockSocketP1, { gameId, newName: '' });

            const game = manager.getGame(gameId);
            expect(game.players[0].name).toBe('Alice');
        });

        it('frees a player avatar when they leave the lobby so other players can claim it', () => {
            mockSocketP1 = { id: 'socket_p1', join: () => {}, emit: () => {} };
            mockSocketP2 = { id: 'socket_p2', join: () => {}, emit: () => {} };
            handleJoinGame(mockIo, mockSocketP1, { gameId, playerName: 'Alice', language: 'en', avatar: AVATARS[0] });
            handleJoinGame(mockIo, mockSocketP2, { gameId, playerName: 'Bob', language: 'en', avatar: AVATARS[1] });

            const game = manager.getGame(gameId);
            expect(game.players).toHaveLength(2);

            // Alice leaves
            const alice = game.players.find(p => p.name === 'Alice');
            game.players = game.players.filter(p => p.id !== alice.id);

            // Bob can now claim Alice's former avatar (AVATARS[0])
            handleChangeAvatar(mockIo, mockSocketP2, { gameId, avatar: AVATARS[0] });
            expect(game.players[0].avatar).toBe(AVATARS[0]);
        });

        it('handles max 14 players each getting distinct avatars, and rejects 15th player as lobby full', () => {
            for (let i = 0; i < 14; i++) {
                const s = { id: `socket_${i}`, join: () => {}, emit: () => {} };
                handleJoinGame(mockIo, s, { gameId, playerName: `P${i + 1}`, language: 'en' });
            }

            const game = manager.getGame(gameId);
            expect(game.players).toHaveLength(14);

            // All 14 players have distinct avatars
            const avatarsUsed = game.players.map(p => p.avatar);
            expect(new Set(avatarsUsed).size).toBe(14);

            // 15th player gets rejected as lobby full
            let p15Error = null;
            const s15 = {
                id: 'socket_15',
                join: () => {},
                emit: (event, payload) => {
                    if (event === 'error-message') p15Error = payload;
                }
            };
            handleJoinGame(mockIo, s15, { gameId, playerName: 'P15', language: 'en' });

            expect(game.players).toHaveLength(14);
            expect(p15Error).toBeTruthy();
            expect(p15Error.key).toBe('lobbyFull');
        });
    });
});
