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

        it('partitions 11 players into exactly 4 Quads (4-way brawls) and 2 Trios (3-way brawls) across all rounds', () => {
            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                expect(pairings).toHaveLength(6);

                const quads = pairings.filter(b => b.length === 4);
                const trios = pairings.filter(b => b.length === 3);

                expect(quads).toHaveLength(4);
                expect(trios).toHaveLength(2);

                // Total competitor slots: (4 * 4) + (2 * 3) = 22 = 11 * 2
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

        it('rotates trio assignments across rounds so trio battles are shared fairly among players', () => {
            const trioPlayersByRound = [];

            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                const trios = pairings.filter(b => b.length === 3);
                const playersInTrios = new Set(trios.flat());
                trioPlayersByRound.push(playersInTrios);
            }

            // Verify that Round 1, Round 2, and Round 3 rotate the players in trios
            const round1TrioStr = [...trioPlayersByRound[0]].sort().join(',');
            const round2TrioStr = [...trioPlayersByRound[1]].sort().join(',');
            const round3TrioStr = [...trioPlayersByRound[2]].sort().join(',');

            expect(round1TrioStr).not.toBe(round2TrioStr);
            expect(round2TrioStr).not.toBe(round3TrioStr);
        });

        it('guarantees balanced 3-round allocation across Quads and Trios for all 11 players', () => {
            const trioCountPerPlayer = {};
            const quadCountPerPlayer = {};
            playerIds11.forEach(id => {
                trioCountPerPlayer[id] = 0;
                quadCountPerPlayer[id] = 0;
            });

            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds11, round);
                pairings.forEach(battle => {
                    if (battle.length === 3) {
                        battle.forEach(id => trioCountPerPlayer[id]++);
                    } else if (battle.length === 4) {
                        battle.forEach(id => quadCountPerPlayer[id]++);
                    }
                });
            }

            // In 11 players over 3 rounds:
            // Every player participates in 6 total battles
            const allTrioPlayers = new Set();
            playerIds11.forEach(id => {
                expect(trioCountPerPlayer[id] + quadCountPerPlayer[id]).toBe(6);
                expect(trioCountPerPlayer[id]).toBeGreaterThanOrEqual(0);
                expect(trioCountPerPlayer[id]).toBeLessThanOrEqual(3);
                expect(quadCountPerPlayer[id]).toBeGreaterThanOrEqual(3);
                expect(quadCountPerPlayer[id]).toBeLessThanOrEqual(6);
                if (trioCountPerPlayer[id] > 0) allTrioPlayers.add(id);
            });
            expect(allTrioPlayers.size).toBeGreaterThanOrEqual(8);
        });

        it('verifies scoring fairness between 4-way quads and 3-way trios in an 11-player lobby', () => {
            const game11 = {
                id: 'GAME_11',
                currentRound: 1,
                players: playerIds11.map(id => ({ id, name: id, score: 0 })),
                battleSchedule: []
            };

            // Quad battle: 4 competitors, 7 voters (11 - 4 = 7 votes total)
            const quadBattle = {
                id: 'quad_11',
                competitors: ['player_1', 'player_2', 'player_3', 'player_4'],
                answers: { player_1: 'Quad Ans A', player_2: 'Quad Ans B', player_3: 'Quad Ans C', player_4: 'Quad Ans D' },
                votes: {
                    player_5: 'player_1', player_6: 'player_1', player_7: 'player_1', player_8: 'player_1',
                    player_9: 'player_2', player_10: 'player_2',
                    player_11: 'player_3'
                },
                wordBanks: { player_1: [], player_2: [], player_3: [], player_4: [] }
            };

            calculateBattlePoints(game11, quadBattle);
            // player_1 gets 4 votes * 300 + 200 = 1400; player_2 gets 2 * 300 = 600; player_3 gets 1 * 300 = 300; player_4 gets 0
            expect(quadBattle.winnerId).toBe('player_1');
            expect(quadBattle.pointsAwarded['player_1']).toBe(1400);
            expect(quadBattle.pointsAwarded['player_2']).toBe(600);
            expect(quadBattle.pointsAwarded['player_3']).toBe(300);
            expect(quadBattle.pointsAwarded['player_4']).toBe(0);

            // Trio battle: 3 competitors, 8 voters (11 - 3 = 8 votes total)
            const trioBattle = {
                id: 'trio_11',
                competitors: ['player_5', 'player_6', 'player_7'],
                answers: { player_5: 'Trio Ans A', player_6: 'Trio Ans B', player_7: 'Trio Ans C' },
                votes: {
                    player_1: 'player_5', player_2: 'player_5', player_3: 'player_5', player_4: 'player_5',
                    player_8: 'player_6', player_9: 'player_6',
                    player_10: 'player_7', player_11: 'player_7'
                },
                wordBanks: { player_5: [], player_6: [], player_7: [] }
            };

            calculateBattlePoints(game11, trioBattle);
            // player_5 gets 4 votes * 300 + 200 = 1400; player_6 gets 2 * 300 = 600; player_7 gets 2 * 300 = 600
            expect(trioBattle.winnerId).toBe('player_5');
            expect(trioBattle.pointsAwarded['player_5']).toBe(1400);
            expect(trioBattle.pointsAwarded['player_6']).toBe(600);
            expect(trioBattle.pointsAwarded['player_7']).toBe(600);
        });

        it('guarantees 13-player hybrid matrix partitions into 5 quads + 2 trios with balanced 3-round allocation', () => {
            const playerIds13 = Array.from({ length: 13 }, (_, i) => `p13_${i + 1}`);
            const trioCountPerPlayer = {};
            const quadCountPerPlayer = {};
            playerIds13.forEach(id => {
                trioCountPerPlayer[id] = 0;
                quadCountPerPlayer[id] = 0;
            });

            for (let round = 1; round <= 3; round++) {
                const pairings = generateBattlePairings(playerIds13, round);
                expect(pairings).toHaveLength(7);

                const quads = pairings.filter(b => b.length === 4);
                const trios = pairings.filter(b => b.length === 3);
                expect(quads).toHaveLength(5);
                expect(trios).toHaveLength(2);

                pairings.forEach(battle => {
                    if (battle.length === 3) {
                        battle.forEach(id => trioCountPerPlayer[id]++);
                    } else if (battle.length === 4) {
                        battle.forEach(id => quadCountPerPlayer[id]++);
                    }
                });
            }

            // Every player in 13-player lobby has 6 total battles across 3 rounds
            const all13TrioPlayers = new Set();
            playerIds13.forEach(id => {
                expect(trioCountPerPlayer[id] + quadCountPerPlayer[id]).toBe(6);
                expect(trioCountPerPlayer[id]).toBeGreaterThanOrEqual(0);
                expect(trioCountPerPlayer[id]).toBeLessThanOrEqual(3);
                expect(quadCountPerPlayer[id]).toBeGreaterThanOrEqual(3);
                expect(quadCountPerPlayer[id]).toBeLessThanOrEqual(6);
                if (trioCountPerPlayer[id] > 0) all13TrioPlayers.add(id);
            });
            expect(all13TrioPlayers.size).toBeGreaterThanOrEqual(8);
        });
    });
});
