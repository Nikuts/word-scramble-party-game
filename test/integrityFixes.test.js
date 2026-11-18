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
import { getFallbackFinalRoundPrompts } from '../game/fallback/index.js';

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

    describe('B8: resetGameForRestart clears battleHistory and superlatives while preserving used content history and incrementing gameInstanceId', () => {
        it('wipes battleHistory, superlatives, pairHistory, and playerUsedBundles on restart and increments gameInstanceId', () => {
            const game = {
                id: 'RSET',
                gameInstanceId: 1,
                theme: 'Cyberpunk',
                players: [{ id: 'p1', name: 'Alice', socketId: 's1', score: 900, hasUsedTimeBoost: true }],
                battleHistory: [{ id: 'b-old' }],
                superlatives: { ammoFactory: { playerId: 'p1', value: 100 } },
                pairHistory: { 'p1:p2': 2 },
                playerUsedBundles: { p1: ['b1'] },
                usedFallbackThemes: ['Theme A'],
                usedQuestions: ['Old Question 1'],
                usedBattlePrompts: ['Old Battle Prompt 1'],
                usedFinalPrompts: ['Old Genre — Old Premise'],
                partialAnswers: { 'q-1-0-p1': 'Leftover draft' }
            };

            gameService.resetGameForRestart(game);

            expect(game.gameInstanceId).toBe(2);
            expect(game.battleHistory).toEqual([]);
            expect(game.superlatives).toBeNull();
            expect(game.pairHistory).toEqual({});
            expect(game.playerUsedBundles).toEqual({});
            expect(game.partialAnswers).toEqual({});
            expect(game.players[0].score).toBe(0);
            expect(game.players[0].hasUsedTimeBoost).toBe(false);
            expect(game.usedFallbackThemes).toEqual(['Theme A', 'Cyberpunk']);
            expect(game.usedThemesHistory).toContain('Cyberpunk');
            expect(game.usedQuestions).toEqual(['Old Question 1']);
            expect(game.usedBattlePrompts).toEqual(['Old Battle Prompt 1']);
            expect(game.usedFinalPrompts).toEqual(['Old Genre — Old Premise']);
        });

        it('prefixes question and battle IDs with g2- after restart and excludes previously used questions/prompts', async () => {
            const game = {
                id: 'RST2',
                gameInstanceId: 1,
                language: 'en',
                theme: 'Adulting & Modern Life',
                currentRound: 0,
                geminiApiErrorCount: 3, // force fallback pack
                players: [
                    { id: 'p1', name: 'Alice', socketId: 's1', score: 0 },
                    { id: 'p2', name: 'Bob', socketId: 's2', score: 0 },
                    { id: 'p3', name: 'Charlie', socketId: 's3', score: 0 }
                ],
                usedQuestions: [],
                usedBattlePrompts: [],
                partialAnswers: {}
            };
            manager.addGame('RST2', game);

            await roundService.startNextRound(mockIo, game);
            timerService.clearPhaseTimer(game);

            const game1QuestionIds = game.playerAnswers.p1.questions.map(q => q.id);
            const game1Questions = Object.values(game.playerAnswers).flatMap(pa => pa.questions.map(q => q.text));
            expect(game1QuestionIds[0]).toBe('q-1-0-p1');
            expect(game.usedQuestions.length).toBeGreaterThanOrEqual(game1Questions.length);

            // Restart for Game 2 with same players
            gameService.resetGameForRestart(game);
            game.theme = 'Adulting & Modern Life';
            game.geminiApiErrorCount = 3;

            await roundService.startNextRound(mockIo, game);
            timerService.clearPhaseTimer(game);

            const game2QuestionIds = game.playerAnswers.p1.questions.map(q => q.id);
            const game2Questions = Object.values(game.playerAnswers).flatMap(pa => pa.questions.map(q => q.text));

            // Game 2 question IDs include the gameInstanceId prefix (g2-) so cached partial drafts never collide
            expect(game2QuestionIds[0]).toBe('q-g2-1-0-p1');
            expect(game2QuestionIds[0]).not.toBe(game1QuestionIds[0]);

            // None of the Game 1 questions should be dealt again in Game 2 Round 1
            const repeatedQuestions = game2Questions.filter(q => game1Questions.includes(q));
            expect(repeatedQuestions).toEqual([]);
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

    describe('B12: getFallbackFinalRoundPrompts avoids repeating seen final prompts across Play Again', () => {
        it('prioritizes unseen genre:premise keys over already used ones', () => {
            const sampleAll = getFallbackFinalRoundPrompts('en', 100);
            const uniqueKeys = Array.from(new Set(sampleAll.map(p => `${p.genre}:${p.premise}`)));
            expect(uniqueKeys.length).toBeGreaterThan(3);

            const used = uniqueKeys.slice(0, uniqueKeys.length - 2);
            const expectedRemaining = new Set(uniqueKeys.slice(uniqueKeys.length - 2));

            const picked = getFallbackFinalRoundPrompts('en', 2, used);
            expect(picked).toHaveLength(2);
            picked.forEach(p => {
                expect(expectedRemaining.has(`${p.genre}:${p.premise}`)).toBe(true);
            });

            // When all prompts are used, still returns the requested count instead of empty
            const wrapped = getFallbackFinalRoundPrompts('en', 2, uniqueKeys);
            expect(wrapped).toHaveLength(2);
        });
    });

    describe('B13: calculateGameSuperlatives deduplicates battles and excludes punctuation from word counts', () => {
        it('counts Round 3 battle once when present in both battleHistory and battleSchedule, and strips punctuation', () => {
            const dupBattle = {
                id: 'b-r3-0',
                winnerId: 'p1',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'Wait , what ?! No ... way !', // 4 real words, 8 tokens if punctuation counted
                    p2: 'Two words only . Yes , six words total !' // 7 real words
                },
                votes: { p3: 'p1' },
                royalties: [{ authorId: 'p2', points: 25 }],
                scoreBreakdown: {
                    p1: { votes: 1, votePoints: 100, winBonus: 500, sweepBonus: 0, total: 600 },
                    p2: { votes: 0, votePoints: 0, winBonus: 0, sweepBonus: 0, total: 0 }
                }
            };

            const game = {
                id: 'SUP1',
                players: [
                    { id: 'p1', name: 'Alice', score: 600 },
                    { id: 'p2', name: 'Bob', score: 25 },
                    { id: 'p3', name: 'Charlie', score: 0 }
                ],
                battleHistory: [dupBattle],
                battleSchedule: [dupBattle]
            };

            const sups = gameService.calculateGameSuperlatives(game);
            expect(sups.ammoFactory).toBeDefined();
            expect(sups.ammoFactory.playerId).toBe('p2');
            expect(sups.ammoFactory.value).toBe(25); // Must not double to 50

            expect(sups.minimalist).toBeDefined();
            expect(sups.minimalist.playerId).toBe('p1');
            expect(sups.minimalist.count).toBe(4);

            expect(sups.shakespeare).toBeDefined();
            expect(sups.shakespeare.playerId).toBe('p1');
            expect(sups.shakespeare.count).toBe(4);
        });
    });

    describe('Step 1 Audit Fixes: Stale Async Guards & Timed-Out Vote Rejection', () => {
        it('rejects votes cast for a timed-out competitor placeholder answer', async () => {
            const { handleVote } = await import('../game/handlers/gameplayHandlers.js');
            const g = {
                id: 'VTMO',
                phase: 'battle_voting',
                currentVotingBattleIndex: 0,
                players: [
                    { id: 'p1', socketId: 's1', score: 0 },
                    { id: 'p2', socketId: 's2', score: 0 },
                    { id: 'p3', socketId: 's3', score: 0 }
                ],
                battleSchedule: [{
                    id: 'b-0',
                    competitors: ['p1', 'p2'],
                    optionOrder: ['p1', 'p2'],
                    answers: { p1: 'Valid answer', p2: '::TIMEOUT::' },
                    wordBanks: { p1: [], p2: [] },
                    votes: {}
                }]
            };
            manager.addGame('VTMO', g);

            handleVote(mockIo, { id: 's3', rooms: new Set(['VTMO']) }, {
                gameId: 'VTMO',
                playerId: 'p3',
                battleId: 'b-0',
                optionId: 'opt_1'
            });

            expect(g.battleSchedule[0].votes['p3']).toBeUndefined();

            handleVote(mockIo, { id: 's3', rooms: new Set(['VTMO']) }, {
                gameId: 'VTMO',
                playerId: 'p3',
                battleId: 'b-0',
                optionId: 'opt_0'
            });

            expect(g.battleSchedule[0].votes['p3']).toBe('p1');
        });

        it('getFallbackRoundData keeps multi-word phrases intact instead of flattening to single words', async () => {
            const { getFallbackRoundData } = await import('../game/services/roundService.js');
            const round = getFallbackRoundData('en', []);
            expect(round.fallbackWords.some(phrase => phrase.includes(' '))).toBe(true);
        });

        it('startNextRound aborts safely when game is reset/deleted before round generation finishes', async () => {
            const { startNextRound } = await import('../game/services/roundService.js');
            const g = {
                id: 'STLE',
                phase: 'lobby',
                language: 'en',
                currentRound: 0,
                gameInstanceId: 1,
                geminiApiErrorCount: 5,
                players: [{ id: 'p1', name: 'A', socketId: 's1' }],
                usedQuestions: [],
                usedBattlePrompts: [],
                usedFallbackThemes: [],
                battleHistory: [],
                answerHistory: [],
                prefetchedRoundData: {
                    roundIndex: 1,
                    gameInstanceId: 1,
                    data: { playerQuestions: [['Q1']], battlePrompts: ['B1'], fallbackWords: ['w1'] }
                },
                prefetchedRoundPromise: Promise.resolve().then(() => {
                    // Simulate Play Again or deletion mid-await
                    g.gameInstanceId = 2;
                    g.phase = 'lobby';
                    return { playerQuestions: [['Q1']], battlePrompts: ['B1'], fallbackWords: ['w1'] };
                })
            };
            manager.addGame('STLE', g);
            await startNextRound(mockIo, g);
            expect(g.phase).toBe('lobby');
        });
    });
});
