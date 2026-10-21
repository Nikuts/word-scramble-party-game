import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as battleService from '../game/services/battleService.js';
import * as helpers from '../game/helpers.js';
import * as gameplayHandlers from '../game/handlers/gameplayHandlers.js';
import * as manager from '../game/manager.js';

describe('Step 3: Privacy & Bandwidth (R3) and Tile-ID Submission & Attribution (A4)', () => {
    let mockGame;

    beforeEach(() => {
        mockGame = {
            id: 'TEST',
            gameId: 'TEST',
            phase: 'battle_answering',
            currentRound: 1,
            currentVotingBattleIndex: 0,
            theme: 'Test Theme',
            language: 'en',
            settings: { gameLanguage: 'en', slowpokeMode: false },
            players: [
                { id: 'p1', name: 'Alice', socketId: 's1', score: 0, isHost: true },
                { id: 'p2', name: 'Bob', socketId: 's2', score: 0, isHost: false },
                { id: 'p3', name: 'Charlie', socketId: 's3', score: 0, isHost: false },
                { id: 'p4', name: 'Diana', socketId: 's4', score: 0, isHost: false }
            ],
            playerAnswers: {
                p1: { submittedAll: true, questions: [{ id: 1, question: 'Q1', answer: 'apple banana' }] },
                p2: { submittedAll: false, questions: [{ id: 1, question: 'Q1', answer: '' }] }
            },
            playerWordPools: {},
            playerUsedBundles: {},
            battleSchedule: [
                {
                    id: 1,
                    competitors: ['p1', 'p2'],
                    optionOrder: ['p2', 'p1'],
                    prompt: 'Why did the chicken cross the road?',
                    promptTokens: [
                        { id: 'p_0', text: 'Why', source: 'prompt', authorId: null, bundleId: null },
                        { id: 'p_1', text: 'the', source: 'prompt', authorId: null, bundleId: null },
                        { id: 'p_2', text: 'chicken', source: 'prompt', authorId: null, bundleId: null }
                    ],
                    wordBanks: {
                        p1: [
                            { id: 'b_0', text: 'chicken', authorId: 'p3', bundleId: 'b_p3_1', source: 'bank' },
                            { id: 'b_1', text: 'rocket', authorId: 'p3', bundleId: 'b_p3_1', source: 'bank' },
                            { id: 'b_2', text: 'rocket', authorId: 'p4', bundleId: 'b_p4_1', source: 'bank' },
                            { id: 'b_3', text: 'banana', authorId: 'p1', bundleId: 'b_p1_1', source: 'bank' }
                        ],
                        p2: [
                            { id: 'b_0', text: 'laser', authorId: 'p4', bundleId: 'b_p4_2', source: 'bank' },
                            { id: 'b_1', text: 'sharks', authorId: 'p3', bundleId: 'b_p3_2', source: 'bank' }
                        ]
                    },
                    answers: {},
                    answerTileIds: {},
                    partialAnswers: {},
                    votes: {},
                    winnerId: null
                }
            ],
            battleHistory: [
                { id: 99, competitors: ['p1', 'p2'], wordBanks: { p1: [], p2: [] }, answers: { p1: 'Hi', p2: 'Yo' }, votes: {} }
            ]
        };
    });

    describe('A4: Tile-ID Submission, Server Reconstruction & Attribution', () => {
        it('reconstructs answer from valid tileIds and records used bundles', () => {
            const battle = mockGame.battleSchedule[0];
            const res = battleService.resolveBattleSubmission(mockGame, battle, 'p1', {
                tileIds: ['p_1', 'b_1', 'p_2']
            });

            expect(res).not.toBeNull();
            expect(res.answer).toBe('the rocket chicken');
            expect(res.tileIds).toEqual(['p_1', 'b_1', 'p_2']);
            expect(res.usedBundles).toContain('b_p3_1');
        });

        it('rejects forged tileIds or empty arrays', () => {
            const battle = mockGame.battleSchedule[0];

            const forged = battleService.resolveBattleSubmission(mockGame, battle, 'p1', {
                tileIds: ['p_1', 'forged_tile']
            });
            expect(forged).toBeNull();

            const empty = battleService.resolveBattleSubmission(mockGame, battle, 'p1', {
                tileIds: []
            });
            expect(empty).toBeNull();
        });

        it('rejects out-of-bank raw string submissions', () => {
            const battle = mockGame.battleSchedule[0];
            const forgedText = battleService.resolveBattleSubmission(mockGame, battle, 'p1', {
                answer: 'completely invented words'
            });
            expect(forgedText).toBeNull();
        });

        it('does not pay bank royalties when a matching word was tapped from promptTokens (p_*)', () => {
            const battle = mockGame.battleSchedule[0];
            // Both p_2 and b_0 have text "chicken", where b_0 belongs to p3.
            // p1 taps p_1 ("the") and p_2 ("chicken" from prompt), plus b_3 ("banana" from p1).
            battle.answers.p1 = 'The chicken banana';
            battle.answerTileIds.p1 = ['p_1', 'p_2', 'b_3'];
            battle.answers.p2 = 'Laser sharks';
            battle.answerTileIds.p2 = ['b_0', 'b_1'];
            battle.votes = { p3: 'p1', p4: 'p1' };

            battleService.calculateBattlePoints(mockGame, battle);

            // p3 should NOT receive royalties from p1's answer since p1 tapped prompt token p_2 ("chicken"), not b_0!
            const p1RoyaltiesForP3 = battle.royalties.filter(r => r.usedBy === 'p1' && r.authorId === 'p3');
            expect(p1RoyaltiesForP3).toHaveLength(0);

            const p1Annotations = battle.annotatedAnswers.p1.words;
            const chickenWord = p1Annotations.find(w => w.text.toLowerCase() === 'chicken');
            expect(chickenWord.authorIndex).toBe(-1);
        });

        it('credits the exact author when two bank tiles have identical text', () => {
            const battle = mockGame.battleSchedule[0];
            // p1 has b_1 ("rocket" from p3) and b_2 ("rocket" from p4).
            // p1 specifically taps b_2 ("rocket" from p4).
            battle.answers.p1 = 'The rocket';
            battle.answerTileIds.p1 = ['p_1', 'b_2'];
            battle.answers.p2 = 'Laser';
            battle.answerTileIds.p2 = ['b_0'];
            battle.votes = { p3: 'p1' };

            battleService.calculateBattlePoints(mockGame, battle);

            const p1RoyaltiesForP3 = battle.royalties.filter(r => r.usedBy === 'p1' && r.authorId === 'p3');
            const p1RoyaltiesForP4 = battle.royalties.filter(r => r.usedBy === 'p1' && r.authorId === 'p4');
            expect(p1RoyaltiesForP3).toHaveLength(0);
            expect(p1RoyaltiesForP4).toHaveLength(1);

            const rocketAnnotation = battle.annotatedAnswers.p1.words.find(w => w.text.toLowerCase() === 'rocket');
            expect(rocketAnnotation.authorIndex).toBe(0);
        });
    });

    describe('R3: Per-Client State Filtering & Anonymous Voting', () => {
        it('filters playerAnswers in question phase so players only see their own questions', () => {
            mockGame.phase = 'question';
            const p1State = helpers.getSanitizedGameState(mockGame, { role: 'player', playerId: 'p1' });
            expect(Object.keys(p1State.playerAnswers)).toEqual(['p1']);
            expect(p1State.playerAnswers.p1.questions[0].answer).toBe('apple banana');

            const hostState = helpers.getSanitizedGameState(mockGame, { role: 'hostDisplay' });
            expect(hostState.playerAnswers.p1.questions[0].answer).toBe(true);
            expect(hostState.playerAnswers.p1.questions[0].question).toBeUndefined();
        });

        it('filters wordBanks in battle_answering so players only receive their own bank without authorId', () => {
            mockGame.phase = 'battle_answering';
            const p1State = helpers.getSanitizedGameState(mockGame, { role: 'player', playerId: 'p1' });
            const battle = p1State.battleSchedule[0];

            expect(Object.keys(battle.wordBanks)).toEqual(['p1']);
            expect(battle.wordBanks.p1[0].authorId).toBeUndefined();
            expect(battle.wordBanks.p2).toBeUndefined();
        });

        it('strips competitor IDs and author mappings during battle_voting', () => {
            mockGame.phase = 'battle_voting';
            const battle = mockGame.battleSchedule[0];
            battle.answers = { p1: 'Answer from Alice', p2: 'Answer from Bob' };
            battle.votes = { p3: 'p2' };

            const voterState = helpers.getSanitizedGameState(mockGame, { role: 'player', playerId: 'p3' });
            const vBattle = voterState.battleSchedule[0];

            expect(vBattle.competitors).toEqual([]);
            expect(vBattle.competitorCount).toBe(2);
            expect(vBattle.votedCount).toBe(1);
            expect(vBattle.totalVoters).toBe(2);
            expect(vBattle.hasVoted).toBe(true);
            expect(vBattle.isCompetitor).toBe(false);
            // Voting options follow optionOrder ['p2', 'p1'] and use anonymous opt_0, opt_1
            expect(vBattle.votingOptions).toEqual([
                { optionId: 'opt_0', answer: 'Answer from Bob' },
                { optionId: 'opt_1', answer: 'Answer from Alice' }
            ]);
            expect(vBattle.answers.p1).toBeUndefined();
            expect(vBattle.answers.p2).toBeUndefined();
            expect(vBattle.votes.p3).toBe(true);
        });

        it('maps anonymous optionId votes to the true competitor in handleVote', () => {
            mockGame.phase = 'battle_voting';
            const battle = mockGame.battleSchedule[0];
            battle.answers = { p1: 'Answer from Alice', p2: 'Answer from Bob' };
            // optionOrder is ['p2', 'p1'], so opt_0 -> p2, opt_1 -> p1

            const getGameSpy = vi.spyOn(manager, 'getGame').mockReturnValue(mockGame);
            const mockIo = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
            const voterSocket = { id: 's3', gameId: 'TEST', emit: () => {} };

            gameplayHandlers.handleVote(mockIo, voterSocket, {
                gameId: 'TEST',
                playerId: 'p3',
                battleId: 1,
                optionId: 'opt_0'
            });

            expect(battle.votes.p3).toBe('p2');
            getGameSpy.mockRestore();
        });

        it('omits battleHistory until game.phase === results', () => {
            mockGame.phase = 'battle_voting';
            const midGameState = helpers.getSanitizedGameState(mockGame, { role: 'hostDisplay' });
            expect(midGameState.battleHistory).toEqual([]);

            mockGame.phase = 'results';
            const endGameState = helpers.getSanitizedGameState(mockGame, { role: 'hostDisplay' });
            expect(endGameState.battleHistory.length).toBe(1);
            expect(endGameState.battleHistory[0].wordBanks).toBeUndefined();
        });
    });
});
