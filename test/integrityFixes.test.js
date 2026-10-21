import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as manager from '../game/manager.js';
import * as helpers from '../game/helpers.js';
import * as timerService from '../game/services/timerService.js';
import * as roundService from '../game/services/roundService.js';
import * as battleService from '../game/services/battleService.js';
import * as gameService from '../game/services/gameService.js';
import { withValidation } from '../game/handlers/validation.js';
import { gameIdSchema } from '../game/validationSchemas.js';
import {
    handleSubmitAnswer,
    handleVote,
    handleUseTimeBoost
} from '../game/handlers/gameplayHandlers.js';
import {
    handleSetTheme,
    handleStartGame
} from '../game/handlers/lobbyHandlers.js';
import { handleLeaveGame } from '../game/handlers/connectionHandlers.js';

describe('Step 1: Integrity Fixes (B1-B4, B7-B11, R1, R2)', () => {
    let mockIo;

    beforeEach(() => {
        const activeGames = manager.getGames();
        Object.keys(activeGames).forEach(id => manager.deleteGame(id));

        mockIo = {
            to: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            emit: vi.fn(),
            disconnectSockets: vi.fn()
        };
    });

    describe('B1: +30s Time Boost never shortens the timer', () => {
        it('extends a 240s Round 1 question timer to 270s instead of clamping down to 180s', () => {
            const game = {
                id: 'BST1',
                language: 'en',
                currentRound: 1,
                slowpokeMode: false,
                players: [
                    { id: 'p1', name: 'Alice', socketId: 's1', hasUsedTimeBoost: false }
                ],
                playerAnswers: {
                    p1: { questions: [{ id: 'q1', text: 'Q1', answer: '' }], submittedAll: false }
                }
            };
            manager.addGame('BST1', game);

            // Round 1 has 4 questions * 60s = 240s
            roundService.startQuestionPhase(mockIo, game, 4);
            const initialEndTime = game.phaseEndTime;

            handleUseTimeBoost(mockIo, { id: 's1', data: { gameId: 'BST1', playerId: 'p1' } }, {
                gameId: 'BST1'
            });

            expect(game.phaseEndTime).toBeGreaterThan(initialEndTime + 25000);
            const remaining = Math.round((game.phaseEndTime - Date.now()) / 1000);
            expect(remaining).toBeGreaterThanOrEqual(269);

            timerService.clearPhaseTimer(game);
        });
    });

    describe('B2 & R1: Boosting or pausing/resuming preserves partial answer drafts on expiry', () => {
        it('hydrates partial question answers when timer expires after a +30s boost or pause/resume', async () => {
            const game = {
                id: 'DRFT',
                language: 'en',
                currentRound: 1,
                players: [
                    { id: 'p1', name: 'Alice', socketId: 's1' },
                    { id: 'p2', name: 'Bob', socketId: 's2' }
                ],
                playerAnswers: {
                    p1: {
                        questions: [{ id: 'q-1-0-p1', text: 'Q1', answer: '' }],
                        submittedAll: false
                    },
                    p2: {
                        questions: [{ id: 'q-1-0-p2', text: 'Q2', answer: '' }],
                        submittedAll: false
                    }
                },
                partialAnswers: {
                    'q-1-0-p1': 'My unsaved partial draft from Alice'
                },
                preGeneratedBattlePrompts: ['Prompt 1', 'Prompt 2']
            };
            manager.addGame('DRFT', game);

            roundService.startQuestionPhase(mockIo, game, 1);
            timerService.pauseTimer(game);
            timerService.resumeTimer(mockIo, game);
            timerService.extendPhaseTimer(mockIo, game, 30);

            expect(typeof game.phaseOnExpire).toBe('function');

            // Simulate timer expiration via stored phaseOnExpire
            timerService.clearPhaseTimer(game);
            await game.phaseOnExpire(mockIo, game);
            timerService.clearPhaseTimer(game);

            expect(game.playerAnswers.p1.questions[0].answer).toBe('My unsaved partial draft from Alice');
            expect(game.playerAnswers.p2.questions[0].answer).toBe('::TIMEOUT::');
            expect(game.playerAnswers.p1.submittedAll).toBe(true);
        });

        it('hydrates partial battle answers when startVotingGetReadyPhase is triggered after boost/resume', () => {
            const game = {
                id: 'BDRF',
                language: 'en',
                currentRound: 1,
                phase: 'battle_answering',
                players: [
                    { id: 'p1', name: 'Alice', socketId: 's1' },
                    { id: 'p2', name: 'Bob', socketId: 's2' }
                ],
                battleSchedule: [
                    {
                        id: 'b-1-0',
                        competitors: ['p1', 'p2'],
                        answers: {},
                        votes: {}
                    }
                ],
                partialAnswers: {
                    'b-b-1-0-p1': 'Saved battle draft'
                }
            };
            manager.addGame('BDRF', game);

            battleService.startVotingGetReadyPhase(mockIo, game);
            timerService.clearPhaseTimer(game);

            expect(game.battleSchedule[0].answers.p1).toBe('Saved battle draft');
            expect(game.battleSchedule[0].answers.p2).toBe('::TIMEOUT::');
        });
    });

    describe('B3: Final round prefetch imports generateFinalRoundData cleanly', () => {
        it('initializes prefetchedFinalRoundPromise without throwing ReferenceError', async () => {
            const game = {
                id: 'FINP',
                theme: 'Cyberpunk',
                language: 'en',
                currentRound: 2, // Next round is Round 3 (final round)
                geminiApiErrorCount: 0,
                players: [
                    { id: 'p1', name: 'Alice' },
                    { id: 'p2', name: 'Bob' },
                    { id: 'p3', name: 'Charlie' }
                ]
            };

            roundService.prefetchNextRoundData(game);
            expect(game.prefetchedFinalRoundPromise).toBeDefined();
            // Should resolve cleanly (to null when no API key is configured) without ReferenceError
            await expect(game.prefetchedFinalRoundPromise).resolves.toBeDefined();
        });
    });

    describe('B4 & R2: Socket-bound identity & host authorization', () => {
        it('prevents a player socket from submitting answers, voting, or leaving as another player', () => {
            const game = {
                id: 'AUTH',
                phase: 'question',
                players: [
                    { id: 'p1', name: 'Alice', socketId: 'socket-alice', isHost: true },
                    { id: 'p2', name: 'Bob', socketId: 'socket-bob', isHost: false },
                    { id: 'p3', name: 'Charlie', socketId: 'socket-charlie', isHost: false }
                ],
                playerAnswers: {
                    p1: { questions: [{ id: 'q1', text: 'Q1', answer: '' }], submittedAll: false },
                    p2: { questions: [{ id: 'q2', text: 'Q2', answer: '' }], submittedAll: false }
                },
                battleSchedule: [
                    { id: 'b1', competitors: ['p1', 'p2'], answers: { p1: 'A', p2: 'B' }, votes: {} }
                ]
            };
            manager.addGame('AUTH', game);

            const bobSocket = { id: 'socket-bob', data: { gameId: 'AUTH', playerId: 'p2' } };

            // Bob tries to submit an answer for Alice (p1)
            handleSubmitAnswer(mockIo, bobSocket, {
                gameId: 'AUTH',
                playerId: 'p1',
                questionId: 'q1',
                answer: 'Sabotaged answer'
            });
            expect(game.playerAnswers.p1.questions[0].answer).toBe('');

            // Bob tries to kick Alice via leave-game
            handleLeaveGame(mockIo, bobSocket, {
                gameId: 'AUTH',
                playerId: 'p1'
            });
            expect(game.players.some(p => p.id === 'p1')).toBe(true);

            // Switch to voting: Alice (competitor) tries to vote pretending to be Charlie (p3)
            game.phase = 'battle_voting';
            const aliceSocket = { id: 'socket-alice', data: { gameId: 'AUTH', playerId: 'p1' } };
            handleVote(mockIo, aliceSocket, {
                gameId: 'AUTH',
                playerId: 'p3',
                battleId: 'b1',
                voteForPlayerId: 'p1'
            });
            expect(game.battleSchedule[0].votes.p3).toBeUndefined();
        });

        it('blocks non-host players from changing lobby settings or starting the game', () => {
            const game = {
                id: 'HOST',
                phase: 'lobby',
                theme: 'Initial Theme',
                players: [
                    { id: 'p1', name: 'Alice', socketId: 'socket-alice', isHost: true },
                    { id: 'p2', name: 'Bob', socketId: 'socket-bob', isHost: false },
                    { id: 'p3', name: 'Charlie', socketId: 'socket-charlie', isHost: false }
                ]
            };
            manager.addGame('HOST', game);

            const bobSocket = { id: 'socket-bob', data: { gameId: 'HOST', playerId: 'p2' } };
            handleSetTheme(mockIo, bobSocket, { gameId: 'HOST', theme: 'Hijacked Theme' });
            expect(game.theme).toBe('Initial Theme');

            handleStartGame(mockIo, bobSocket, { gameId: 'HOST' });
            expect(game.phase).toBe('lobby');
        });
    });

    describe('B7: Ammo Factory superlative counts royalty points from calculateBattlePoints', () => {
        it('awards ammoFactory when battles use the standard { points } royalty structure', () => {
            const game = {
                currentRound: 1,
                players: [
                    { id: 'p1', name: 'Alice', score: 0 },
                    { id: 'p2', name: 'Bob', score: 0 },
                    { id: 'p3', name: 'Charlie', score: 0 }
                ],
                battleSchedule: [
                    {
                        id: 'b-1-0',
                        competitors: ['p1', 'p2'],
                        answers: { p1: 'quantum toaster', p2: 'boring answer' },
                        votes: { p3: 'p1' },
                        wordBanks: {
                            p1: [{ text: 'quantum', authorId: 'p3', source: 'answer' }],
                            p2: []
                        }
                    }
                ],
                battleHistory: []
            };

            battleService.calculateBattlePoints(game, game.battleSchedule[0]);
            const superlatives = gameService.calculateGameSuperlatives(game);

            expect(superlatives.ammoFactory).toBeDefined();
            expect(superlatives.ammoFactory.playerId).toBe('p3');
            expect(superlatives.ammoFactory.value).toBe(50);
        });
    });

    describe('B8: resetGameForRestart clears battleHistory and superlatives', () => {
        it('wipes battleHistory, superlatives, pairHistory, and playerUsedBundles on restart', () => {
            const game = {
                id: 'RSET',
                players: [{ id: 'p1', name: 'Alice', socketId: 's1', score: 900, hasUsedTimeBoost: true }],
                battleHistory: [{ id: 'b-old' }],
                superlatives: { ammoFactory: { playerId: 'p1', value: 100 } },
                pairHistory: { 'p1:p2': 2 },
                playerUsedBundles: { p1: ['b1'] }
            };

            gameService.resetGameForRestart(game);

            expect(game.battleHistory).toEqual([]);
            expect(game.superlatives).toBeNull();
            expect(game.pairHistory).toEqual({});
            expect(game.playerUsedBundles).toEqual({});
            expect(game.players[0].score).toBe(0);
            expect(game.players[0].hasUsedTimeBoost).toBe(false);
        });
    });

    describe('B9: prepareBattlePhase transitions to preparing_battles immediately to prevent double execution', () => {
        it('ignores a concurrent second call to prepareBattlePhase', async () => {
            const game = {
                id: 'RACE',
                language: 'en',
                currentRound: 1,
                phase: 'question',
                players: [
                    { id: 'p1', name: 'Alice', socketId: 's1' },
                    { id: 'p2', name: 'Bob', socketId: 's2' },
                    { id: 'p3', name: 'Charlie', socketId: 's3' }
                ],
                playerAnswers: {
                    p1: { questions: [{ id: 'q1', text: 'Q1', answer: 'cats dogs birds' }], submittedAll: true },
                    p2: { questions: [{ id: 'q2', text: 'Q2', answer: 'lasers rockets moon' }], submittedAll: true },
                    p3: { questions: [{ id: 'q3', text: 'Q3', answer: 'pizza pasta cheese' }], submittedAll: true }
                },
                preGeneratedBattlePrompts: ['P1', 'P2', 'P3']
            };
            manager.addGame('RACE', game);

            const call1 = battleService.prepareBattlePhase(mockIo, game);
            expect(game.phase).toBe('preparing_battles');

            // Concurrent second call must be a no-op
            const call2 = battleService.prepareBattlePhase(mockIo, game);
            await Promise.all([call1, call2]);
            timerService.clearPhaseTimer(game);

            expect(game.phase).toBe('battle_get_ready');
            expect(game.battleSchedule).toHaveLength(3);
        });
    });

    describe('B10: withValidation separates validationFailed from handler runtime/async errors', () => {
        it('emits serverError instead of validationFailed when a handler throws or rejects', async () => {
            const mockSocket = {
                server: mockIo,
                emit: vi.fn()
            };

            const syncThrowHandler = withValidation(gameIdSchema, () => {
                throw new Error('Database exploded');
            });
            syncThrowHandler.call(mockSocket, { gameId: 'ABCD' });
            expect(mockSocket.emit).toHaveBeenCalledWith('error-message', expect.objectContaining({
                key: 'serverError'
            }));

            mockSocket.emit.mockClear();
            const asyncRejectHandler = withValidation(gameIdSchema, async () => {
                throw new Error('Async failure');
            });
            asyncRejectHandler.call(mockSocket, { gameId: 'ABCD' });
            await new Promise(r => setTimeout(r, 10));
            expect(mockSocket.emit).toHaveBeenCalledWith('error-message', expect.objectContaining({
                key: 'serverError'
            }));
        });
    });

    describe('B11: Cryptographic ID and token generation', () => {
        it('generates 4-char uppercase alphanumeric game IDs and high-entropy tokens', () => {
            const gameId = helpers.generateGameId();
            const playerId = helpers.generatePlayerId();
            const token = helpers.generatePlayerToken();

            expect(gameId).toMatch(/^[A-Z0-9]{4}$/);
            expect(playerId).toMatch(/^[a-f0-9]{12}$/);
            expect(token).toMatch(/^[a-f0-9]{48}$/);
        });
    });
});
