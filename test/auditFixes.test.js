import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as manager from '../game/manager.js';
import * as helpers from '../game/helpers.js';
import * as timerService from '../game/services/timerService.js';
import * as battleService from '../game/services/battleService.js';
import * as lobbyHandlers from '../game/handlers/lobbyHandlers.js';
import * as gameplayHandlers from '../game/handlers/gameplayHandlers.js';
import { generateWordBanksDirectly } from '../game/services/wordBankEngine.js';

describe('Audit Fixes Verification', () => {
    let mockIo;

    beforeEach(() => {
        Object.keys(manager.getGames()).forEach(id => manager.deleteGame(id));
        mockIo = {
            to: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            emit: vi.fn(),
            disconnectSockets: vi.fn()
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Timer Race Condition & Dynamic Reveal Duration', () => {
        it('broadcastInterval never cancels serverTimeout on the final tick and stale intervals never cancel newer phases', () => {
            vi.useFakeTimers();
            const onExpireFirst = vi.fn();
            const game = {
                id: 'TMR1',
                language: 'en',
                phase: 'lobby',
                players: [{ id: 'p1', socketId: 's1' }]
            };
            manager.addGame('TMR1', game);

            timerService.startPhaseTimer(mockIo, game, 'question', 1, onExpireFirst);
            // Force phaseEndTime slightly earlier than the 1000ms serverTimeout so broadcastInterval triggers Date.now() >= phaseEndTime first
            game.phaseEndTime = Date.now() + 950;

            vi.advanceTimersByTime(1000);
            expect(onExpireFirst).toHaveBeenCalledTimes(1);

            // Now test stale interval isolation when phase transitions rapidly
            const onExpireSecond = vi.fn();
            const onExpireThird = vi.fn();
            timerService.startPhaseTimer(mockIo, game, 'battle_answering', 2, onExpireSecond);
            const secondToken = game.phaseTimerId;
            timerService.startPhaseTimer(mockIo, game, 'battle_voting', 5, onExpireThird);
            const thirdToken = game.phaseTimerId;

            expect(thirdToken).not.toBe(secondToken);
            vi.advanceTimersByTime(2500);
            expect(onExpireSecond).not.toHaveBeenCalled();
            expect(game.phase).toBe('battle_voting');
            expect(game.phaseTimerId).toBe(thirdToken);

            timerService.clearPhaseTimer(game);
        });

        it('scales PHASES.battle_result_reveal.duration by competitor count and slowpoke mode', () => {
            const game = {
                slowpokeMode: false,
                currentVotingBattleIndex: 0,
                battleSchedule: [
                    { id: 'b1', competitors: ['p1', 'p2', 'p3', 'p4'] }
                ]
            };
            // 5 + 3*4 = 17s normal
            expect(timerService.PHASES.battle_result_reveal.duration(game)).toBe(17);
            game.slowpokeMode = true;
            // 17 + 2 = 19s slowpoke
            expect(timerService.PHASES.battle_result_reveal.duration(game)).toBe(19);
        });
    });

    describe('Combined Silly Mode + 18+ Mode', () => {
        it('allows enabling sillyMode and is18PlusMode simultaneously without disabling each other', async () => {
            const socket = { id: 'host-sock', data: { gameId: 'MODE', playerId: 'p1' }, emit: vi.fn() };
            const game = {
                id: 'MODE',
                language: 'en',
                phase: 'lobby',
                sillyMode: false,
                is18PlusMode: false,
                geminiApiErrorCount: 3, // skip live Gemini call
                players: [{ id: 'p1', name: 'Alice', socketId: 'host-sock', isHost: true }],
                playerActionCooldowns: new Map()
            };
            manager.addGame('MODE', game);

            await lobbyHandlers.handleSetSillyMode(mockIo, socket, { gameId: 'MODE', sillyMode: true });
            expect(game.sillyMode).toBe(true);
            expect(game.is18PlusMode).toBe(false);

            await lobbyHandlers.handleSet18PlusMode(mockIo, socket, { gameId: 'MODE', is18PlusMode: true });
            expect(game.sillyMode).toBe(true);
            expect(game.is18PlusMode).toBe(true);

            await lobbyHandlers.handleSetSillyMode(mockIo, socket, { gameId: 'MODE', sillyMode: false });
            expect(game.sillyMode).toBe(false);
            expect(game.is18PlusMode).toBe(true);
        });
    });

    describe('Active Battle Voting Guard & 0-Voter Skip', () => {
        it('rejects votes targeting a non-active battleId', () => {
            const game = {
                id: 'VACT',
                phase: 'battle_voting',
                currentVotingBattleIndex: 0,
                players: [
                    { id: 'p1', socketId: 's1', score: 0 },
                    { id: 'p2', socketId: 's2', score: 0 },
                    { id: 'p3', socketId: 's3', score: 0 }
                ],
                battleSchedule: [
                    { id: 'b-0', competitors: ['p1', 'p2'], optionOrder: ['p1', 'p2'], answers: { p1: 'A', p2: 'B' }, votes: {} },
                    { id: 'b-1', competitors: ['p1', 'p3'], optionOrder: ['p1', 'p3'], answers: { p1: 'C', p3: 'D' }, votes: {} }
                ]
            };
            manager.addGame('VACT', game);

            const p3Socket = { id: 's3', data: { gameId: 'VACT', playerId: 'p3' } };
            gameplayHandlers.handleVote(mockIo, p3Socket, {
                gameId: 'VACT',
                playerId: 'p3',
                battleId: 'b-1',
                optionId: 'opt_0'
            });
            expect(game.battleSchedule[1].votes.p3).toBeUndefined();
            expect(game.battleSchedule[0].votes.p3).toBeUndefined();
        });

        it('skips voting phase immediately when eligibleVoters.length === 0 after mid-game disconnect', () => {
            const game = {
                id: 'ZVOT',
                language: 'en',
                phase: 'voting_get_ready',
                currentRound: 1,
                currentVotingBattleIndex: 0,
                players: [
                    { id: 'p1', name: 'Alice', socketId: 's1', score: 0 },
                    { id: 'p2', name: 'Bob', socketId: 's2', score: 0 },
                    { id: 'p3', name: 'Charlie', socketId: null, score: 0 }
                ],
                battleSchedule: [
                    {
                        id: 'b-0',
                        competitors: ['p1', 'p2'],
                        answers: { p1: 'Answer A', p2: 'Answer B' },
                        wordBanks: { p1: [], p2: [] },
                        votes: {}
                    }
                ]
            };
            manager.addGame('ZVOT', game);

            battleService.startVotingPhase(mockIo, game);
            expect(game.phase).toBe('battle_result_reveal');
            timerService.clearPhaseTimer(game);
        });
    });

    describe('9-14P Pair History Optimization, Submission Validation & 0-Vote Rainbow Guard', () => {
        it('reduces repeat pairings across rounds for 9-14 players using pairHistory', () => {
            const playerIds = Array.from({ length: 10 }, (_, i) => `p${i + 1}`);
            const pairHistory = {};
            const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

            const round1 = battleService.generateBattlePairings(playerIds, 1, pairHistory);
            round1.forEach(group => {
                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        const k = pairKey(group[i], group[j]);
                        pairHistory[k] = (pairHistory[k] || 0) + 1;
                    }
                }
            });

            const round2 = battleService.generateBattlePairings(playerIds, 2, pairHistory);
            let repeats = 0;
            round2.forEach(group => {
                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        if (pairHistory[pairKey(group[i], group[j])]) repeats++;
                    }
                }
            });
            // With 10 players and 5 quads (30 pair edges per round out of 45 possible pairs),
            // history-aware solving must keep repeats far below blind overlap
            expect(round2).toHaveLength(5);
            expect(repeats).toBeLessThanOrEqual(20);
        });

        it('rejects punctuation-only single-line answers and half-empty Round 3 answers unless allowPartialMultiLine is true', () => {
            const game = { id: 'VAL', language: 'en' };
            const singleBattle = {
                id: 'b1',
                competitors: ['p1', 'p2'],
                promptTokens: [{ id: 'p_0', text: 'Rule:' }],
                wordBanks: {
                    p1: [
                        { id: 'b_0', text: 'chaos', authorId: 'p2', source: 'answer', bundleId: 'p2_0_0' },
                        { id: 'b_1', text: '!', authorId: null, source: 'punctuation', bundleId: null },
                        { id: 'b_2', text: '.', authorId: null, source: 'punctuation', bundleId: null }
                    ]
                }
            };

            expect(battleService.resolveBattleSubmission(game, singleBattle, 'p1', { tileIds: ['b_1', 'b_2'] })).toBeNull();
            expect(battleService.resolveBattleSubmission(game, singleBattle, 'p1', { tileIds: ['b_0', 'b_1'] })?.answer).toBe('chaos!');

            const finalBattle = {
                id: 'b2',
                genre: 'Sci-Fi',
                competitors: ['p1', 'p2'],
                promptTokens: [],
                wordBanks: singleBattle.wordBanks
            };
            expect(battleService.resolveBattleSubmission(game, finalBattle, 'p1', {
                tileIds: { title: ['b_0'], tagline: [] }
            })).toBeNull();
            expect(battleService.resolveBattleSubmission(game, finalBattle, 'p1', {
                tileIds: { title: ['b_0'], tagline: ['b_1'] }
            })).toBeNull();
            expect(battleService.resolveBattleSubmission(game, finalBattle, 'p1', {
                tileIds: { title: ['b_0'], tagline: [] }
            }, { allowPartialMultiLine: true })?.answer.title).toBe('chaos');
            expect(battleService.resolveBattleSubmission(game, finalBattle, 'p1', {
                tileIds: { title: ['b_0'], tagline: ['b_0'] }
            })?.answer).toEqual({ title: 'chaos', tagline: 'chaos' });
        });

        it('does not award Rainbow Bonus to a 0-vote answer while still paying 3+ word Author Royalties', () => {
            const game = {
                id: 'RNB0',
                currentRound: 3,
                language: 'en',
                players: [
                    { id: 'p1', name: 'Alice', score: 0 },
                    { id: 'p2', name: 'Bob', score: 0 },
                    { id: 'p3', name: 'Charlie', score: 0 },
                    { id: 'p4', name: 'Diana', score: 0 },
                    { id: 'p5', name: 'Eve', score: 0 }
                ]
            };
            const battle = {
                id: 'b-r3-0',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: { title: 'Laser', tagline: 'Penguin Volcano' },
                    p2: { title: 'Winner', tagline: 'Poster' }
                },
                votes: { p3: 'p2', p4: 'p2', p5: 'p2' },
                wordBanks: {
                    p1: [
                        { text: 'laser', authorId: 'p3', source: 'answer' },
                        { text: 'penguin', authorId: 'p4', source: 'answer' },
                        { text: 'volcano', authorId: 'p5', source: 'answer' }
                    ],
                    p2: []
                }
            };

            battleService.calculateBattlePoints(game, battle);
            expect(battle.scoreBreakdown.p1.rainbowBonus).toBe(0);
            expect(battle.pointsAwarded.p1).toBe(0);
            // Authors still receive Round 3 royalties (+100) for their words in p1's 3-word answer
            expect(game.players.find(p => p.id === 'p3').score).toBe(100);
            expect(game.players.find(p => p.id === 'p4').score).toBe(100);
            expect(game.players.find(p => p.id === 'p5').score).toBe(100);
        });
    });

    describe('Network IP Selection, Balanced Chunking & Word Bank Engine', () => {
        it('selectBestLocalIpAddress prefers physical Wi-Fi 192.168.x.x over WSL/Docker/VPN adapters', () => {
            const mockInterfaces = {
                'vEthernet (WSL)': [{ family: 'IPv4', internal: false, address: '172.24.160.1' }],
                'docker0': [{ family: 'IPv4', internal: false, address: '172.17.0.1' }],
                'Tailscale': [{ family: 'IPv4', internal: false, address: '100.64.0.1' }],
                'Wi-Fi': [{ family: 'IPv4', internal: false, address: '192.168.1.42' }]
            };
            expect(helpers.selectBestLocalIpAddress(mockInterfaces)).toBe('192.168.1.42');
        });

        it('getChunksFromText splits 9-14 word clauses cleanly without 1-2 word orphans', () => {
            const elevenWords = 'The sleepy dragon danced wildly in the haunted disco room yesterday';
            const chunks = helpers.getChunksFromText(elevenWords);
            expect(chunks.length).toBe(2);
            chunks.forEach(c => {
                const count = c.split(/\s+/).filter(Boolean).length;
                expect(count).toBeGreaterThanOrEqual(4);
                expect(count).toBeLessThanOrEqual(7);
            });
        });

        it('wordBankEngine keeps fresh sibling words from helper phrases, meets Pass 3 floor, and lowercases sentence-initial stopwords', () => {
            const result = generateWordBanksDirectly({
                language: 'en',
                players: [
                    { id: 'p1', name: 'Alice' },
                    { id: 'p2', name: 'Bob' }
                ],
                playerAnswers: {
                    p1: { questions: [{ answer: 'Because midnight tacos explode loudly' }] },
                    p2: { questions: [{ answer: 'I never trust dancing penguins' }] }
                },
                answerHistory: [],
                battleSchedule: [{ id: 'b-2-0', competitors: ['p1', 'p2'], prompt: 'Test:' }],
                preGeneratedFallbackWords: ['cosmic waffle iron'],
                currentRound: 1,
                playerSeenChunks: {},
                battleHistory: [
                    {
                        id: 'b-1-0',
                        competitors: ['p1', 'p2'],
                        answers: { p1: 'cosmic energy', p2: 'iron shield' }
                    }
                ]
            });

            const bankP1 = result.battleScheduleWithBanks[0].wordBanks.p1;
            const bankP2 = result.battleScheduleWithBanks[0].wordBanks.p2;
            // 'Because' is a sentence-initial stopword/connector -> lowercased to 'because'
            expect(bankP2.some(t => t.source === 'answer' && t.text === 'because')).toBe(true);
            // 'I' stays uppercase
            expect(bankP1.some(t => t.source === 'answer' && t.text === 'I')).toBe(true);
            // Sibling word 'waffle' from 'cosmic waffle iron' is retained even though 'cosmic' and 'iron' were used
            const allBankWords = [...bankP1, ...bankP2].map(t => t.text.toLowerCase());
            expect(allBankWords).toContain('waffle');
        });
    });

    describe('Event Loop Monitor Rolling Window', () => {
        it('does not wipe eventLoopLagMs across back-to-back getServerHealthMetrics calls', () => {
            const m1 = manager.getServerHealthMetrics();
            const m2 = manager.getServerHealthMetrics();
            expect(typeof m1.eventLoopLagMs).toBe('number');
            expect(typeof m2.eventLoopLagMs).toBe('number');
            expect(m1.maxGames).toBeGreaterThanOrEqual(15);
        });
    });
});
