import { describe, it, expect } from 'vitest';
import { generateBattlePairings, calculateBattlePoints } from '../game/services/battleService.js';

describe('Multi-Competitor Brawls (3-Way & 4-Player Battles) and 11-Player Hybrid Fairness', () => {

    describe('Scenario 1: Multi-Competitor Battles (3-Way & 4-Player Brawls) Scoring', () => {
        function createLobby(playerCount = 9, round = 1) {
            return {
                id: 'BRAWL_TEST',
                currentRound: round,
                players: Array.from({ length: playerCount }, (_, i) => ({
                    id: `p${i + 1}`,
                    name: `Player ${i + 1}`,
                    score: 0
                })),
                battleSchedule: []
            };
        }

        it('awards clean sweep to a single dominant winner in a 3-way brawl (1 vs 1 vs 1)', () => {
            const game = createLobby(9, 1);
            // Battle with 3 competitors (p1 vs p2 vs p3). 6 voters (p4 through p9) all vote p1
            const trioBattle = {
                id: 'trio_b1',
                competitors: ['p1', 'p2', 'p3'],
                answers: {
                    p1: 'Dominant answer from p1',
                    p2: 'Decent answer from p2',
                    p3: 'Weak answer from p3'
                },
                votes: {
                    p4: 'p1', p5: 'p1', p6: 'p1', p7: 'p1', p8: 'p1', p9: 'p1'
                },
                wordBanks: { p1: [], p2: [], p3: [] }
            };

            calculateBattlePoints(game, trioBattle);

            // In Round 1 (300/vote, 200 win, 150 sweep):
            // p1: 6 votes * 300 + 200 (win) + 150 (clean sweep) = 2150
            // p2: 0 votes = 0
            // p3: 0 votes = 0
            expect(trioBattle.winnerId).toBe('p1');
            expect(trioBattle.pointsAwarded['p1']).toBe(2150);
            expect(trioBattle.pointsAwarded['p2']).toBe(0);
            expect(trioBattle.pointsAwarded['p3']).toBe(0);
            expect(game.players.find(p => p.id === 'p1').score).toBe(2150);
        });

        it('splits victory bonus fairly between top 2 tied competitors in a 3-way brawl', () => {
            const game = createLobby(9, 1);
            // 6 voters: 3 vote p1, 3 vote p2, 0 vote p3
            const trioBattle = {
                id: 'trio_b2',
                competitors: ['p1', 'p2', 'p3'],
                answers: { p1: 'Ans A', p2: 'Ans B', p3: 'Ans C' },
                votes: {
                    p4: 'p1', p5: 'p1', p6: 'p1',
                    p7: 'p2', p8: 'p2', p9: 'p2'
                },
                wordBanks: { p1: [], p2: [], p3: [] }
            };

            calculateBattlePoints(game, trioBattle);

            // In Round 1 (winBonus 200 split between top 2 = 100 each):
            // p1: 3 votes * 300 + 100 = 1000
            // p2: 3 votes * 300 + 100 = 1000
            // p3: 0 votes = 0
            expect(trioBattle.winnerId).toBeNull();
            expect(trioBattle.pointsAwarded['p1']).toBe(1000);
            expect(trioBattle.pointsAwarded['p2']).toBe(1000);
            expect(trioBattle.pointsAwarded['p3']).toBe(0);
        });

        it('splits victory bonus 3 ways in a 3-way tie in a 3-way brawl', () => {
            const game = createLobby(9, 1);
            // 6 voters: 2 vote p1, 2 vote p2, 2 vote p3
            const trioBattle = {
                id: 'trio_b3',
                competitors: ['p1', 'p2', 'p3'],
                answers: { p1: 'Ans A', p2: 'Ans B', p3: 'Ans C' },
                votes: {
                    p4: 'p1', p5: 'p1',
                    p6: 'p2', p7: 'p2',
                    p8: 'p3', p9: 'p3'
                },
                wordBanks: { p1: [], p2: [], p3: [] }
            };

            calculateBattlePoints(game, trioBattle);

            // Round 1 winBonus 200 split 3 ways: Math.round(200 / 3) = 67
            // p1: 2 * 300 + 67 = 667
            // p2: 2 * 300 + 67 = 667
            // p3: 2 * 300 + 67 = 667
            expect(trioBattle.winnerId).toBeNull();
            expect(trioBattle.pointsAwarded['p1']).toBe(667);
            expect(trioBattle.pointsAwarded['p2']).toBe(667);
            expect(trioBattle.pointsAwarded['p3']).toBe(667);
        });

        it('handles 4-competitor brawl (Answer A vs B vs C vs D) with distributed votes and victory bonus', () => {
            const game = createLobby(12, 1);
            // 4 competitors (p1, p2, p3, p4), 8 voters (p5 through p12)
            // Votes: p1 gets 4, p2 gets 2, p3 gets 1, p4 gets 1
            const quadBattle = {
                id: 'quad_b1',
                competitors: ['p1', 'p2', 'p3', 'p4'],
                answers: { p1: 'Ans A', p2: 'Ans B', p3: 'Ans C', p4: 'Ans D' },
                votes: {
                    p5: 'p1', p6: 'p1', p7: 'p1', p8: 'p1',
                    p9: 'p2', p10: 'p2',
                    p11: 'p3',
                    p12: 'p4'
                },
                wordBanks: { p1: [], p2: [], p3: [], p4: [] }
            };

            calculateBattlePoints(game, quadBattle);

            // p1 wins outright (4 votes): 4 * 300 + 200 (win) = 1400 (no sweep bonus because maxVotes != totalVotes)
            // p2: 2 * 300 = 600
            // p3: 1 * 300 = 300
            // p4: 1 * 300 = 300
            expect(quadBattle.winnerId).toBe('p1');
            expect(quadBattle.pointsAwarded['p1']).toBe(1400);
            expect(quadBattle.pointsAwarded['p2']).toBe(600);
            expect(quadBattle.pointsAwarded['p3']).toBe(300);
            expect(quadBattle.pointsAwarded['p4']).toBe(300);
        });
    });

    describe('Scenario 2: 11-Player Hybrid Allocation & Fairness Matrix', () => {
        const playerIds11 = Array.from({ length: 11 }, (_, i) => `player_${i + 1}`);

        it('partitions 11 players into exactly 6 Trios (1 vs 1 vs 1) and 2 Duos (1 vs 1) across all rounds', () => {
            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                expect(pairings).toHaveLength(8);

                const trios = pairings.filter(b => b.length === 3);
                const duos = pairings.filter(b => b.length === 2);

                expect(trios).toHaveLength(6);
                expect(duos).toHaveLength(2);

                // Total competitor slots: (6 * 3) + (2 * 2) = 22 = 11 * 2
                const totalSlots = pairings.reduce((acc, b) => acc + b.length, 0);
                expect(totalSlots).toBe(22);
            }
        });

        it('guarantees EVERY player participates in EXACTLY 2 battles per round', () => {
            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                const appearances = {};
                playerIds11.forEach(id => { appearances[id] = 0; });

                pairings.forEach(battle => {
                    battle.forEach(id => { appearances[id]++; });
                });

                playerIds11.forEach(id => {
                    expect(appearances[id], `Player ${id} in round ${round} did not have 2 battles`).toBe(2);
                });
            }
        });

        it('guarantees NO player ever faces the same opponent twice in a single round', () => {
            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                const opponents = {};
                playerIds11.forEach(id => { opponents[id] = new Set(); });

                pairings.forEach(battle => {
                    battle.forEach(id => {
                        battle.forEach(otherId => {
                            if (id !== otherId) {
                                expect(opponents[id].has(otherId), `Player ${id} faces ${otherId} multiple times in round ${round}`).toBe(false);
                                opponents[id].add(otherId);
                            }
                        });
                    });
                });
            }
        });

        it('rotates duo assignments across rounds so duo battles are shared fairly among players', () => {
            const duoPlayersByRound = [];

            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                const duos = pairings.filter(b => b.length === 2);
                const playersInDuos = new Set(duos.flat());
                duoPlayersByRound.push(playersInDuos);
            }

            // Verify that Round 1, Round 2, and Round 3 do not assign the exact same set of players to duos
            const round1DuoStr = [...duoPlayersByRound[0]].sort().join(',');
            const round2DuoStr = [...duoPlayersByRound[1]].sort().join(',');
            const round3DuoStr = [...duoPlayersByRound[2]].sort().join(',');

            expect(round1DuoStr).not.toBe(round2DuoStr);
            expect(round2DuoStr).not.toBe(round3DuoStr);
        });

        it('verifies scoring fairness between 1-on-1 duos and 3-way trios in an 11-player lobby', () => {
            const game11 = {
                id: 'GAME_11',
                currentRound: 1,
                players: playerIds11.map(id => ({ id, name: id, score: 0 })),
                battleSchedule: []
            };

            // Duo battle: 2 competitors, 9 voters (11 - 2 = 9 votes total)
            const duoBattle = {
                id: 'duo_11',
                competitors: ['player_1', 'player_2'],
                answers: { player_1: 'Duo Ans A', player_2: 'Duo Ans B' },
                votes: {
                    player_3: 'player_1', player_4: 'player_1', player_5: 'player_1', player_6: 'player_1', player_7: 'player_1',
                    player_8: 'player_2', player_9: 'player_2', player_10: 'player_2', player_11: 'player_2'
                },
                wordBanks: { player_1: [], player_2: [] }
            };

            calculateBattlePoints(game11, duoBattle);
            // player_1 gets 5 votes * 300 + 200 = 1700; player_2 gets 4 votes * 300 = 1200
            expect(duoBattle.winnerId).toBe('player_1');
            expect(duoBattle.pointsAwarded['player_1']).toBe(1700);
            expect(duoBattle.pointsAwarded['player_2']).toBe(1200);

            // Trio battle: 3 competitors, 8 voters (11 - 3 = 8 votes total)
            const trioBattle = {
                id: 'trio_11',
                competitors: ['player_3', 'player_4', 'player_5'],
                answers: { player_3: 'Trio Ans A', player_4: 'Trio Ans B', player_5: 'Trio Ans C' },
                votes: {
                    player_1: 'player_3', player_2: 'player_3', player_6: 'player_3', player_7: 'player_3',
                    player_8: 'player_4', player_9: 'player_4',
                    player_10: 'player_5', player_11: 'player_5'
                },
                wordBanks: { player_3: [], player_4: [], player_5: [] }
            };

            calculateBattlePoints(game11, trioBattle);
            // player_3 gets 4 votes * 300 + 200 = 1400; player_4 gets 2 * 300 = 600; player_5 gets 2 * 300 = 600
            expect(trioBattle.winnerId).toBe('player_3');
            expect(trioBattle.pointsAwarded['player_3']).toBe(1400);
            expect(trioBattle.pointsAwarded['player_4']).toBe(600);
            expect(trioBattle.pointsAwarded['player_5']).toBe(600);
        });
    });
});
