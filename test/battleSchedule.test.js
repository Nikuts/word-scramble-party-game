import { describe, it, expect } from 'vitest';
import { generateBattlePairings } from '../game/services/battleService.js';

describe('Battle Scheduling & Pairing Algorithms', () => {
    // Test for player counts from 3 up to 14
    for (let count = 3; count <= 14; count++) {
        describe(`${count} Players`, () => {
            const playerIds = Array.from({ length: count }, (_, i) => `p_${i + 1}`);

            it(`should assign exactly 2 battles per player with distinct opponents`, () => {
                for (let round = 1; round <= 3; round++) {
                    const pairings = generateBattlePairings(playerIds, round);
                    expect(pairings.length).toBeGreaterThan(0);

                    // Track appearances and opponents per player
                    const appearances = {};
                    const opponents = {};
                    playerIds.forEach(id => {
                        appearances[id] = 0;
                        opponents[id] = new Set();
                    });

                    pairings.forEach(battle => {
                        // Competitors inside a single battle must be unique
                        const uniqueCompetitors = new Set(battle);
                        expect(uniqueCompetitors.size).toBe(battle.length);

                        battle.forEach(id => {
                            appearances[id]++;
                            battle.forEach(otherId => {
                                if (id !== otherId) {
                                    // Opponents must not be repeated across battles
                                    expect(opponents[id].has(otherId)).toBe(false);
                                    opponents[id].add(otherId);
                                }
                            });
                        });
                    });

                    // Every player must participate in exactly 2 battles
                    playerIds.forEach(id => {
                        expect(appearances[id]).toBe(2);
                    });
                }
            });
        });
    }

    describe('Group Size Distributions', () => {
        it('should use 2-player duos for player counts 3 through 8', () => {
            for (let count = 3; count <= 8; count++) {
                const playerIds = Array.from({ length: count }, (_, i) => `p_${i + 1}`);
                const pairings = generateBattlePairings(playerIds, 1);
                expect(pairings.length).toBe(count);
                pairings.forEach(battle => {
                    expect(battle.length).toBe(2);
                });
            }
        });

        it('should create 6 trios (0 duos, 0 quads) for 9 players (total 6 battles)', () => {
            const playerIds = Array.from({ length: 9 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(6);
            const trios = pairings.filter(b => b.length === 3);
            expect(trios.length).toBe(6);
        });

        it('should create 5 quads (4-way brawls) for 10 players (total 5 battles)', () => {
            const playerIds = Array.from({ length: 10 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(5);
            const quads = pairings.filter(b => b.length === 4);
            expect(quads.length).toBe(5);
        });

        it('should create 4 quads + 2 trios for 11 players (total 6 battles)', () => {
            const playerIds = Array.from({ length: 11 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(6);
            const quads = pairings.filter(b => b.length === 4);
            const trios = pairings.filter(b => b.length === 3);
            expect(quads.length).toBe(4);
            expect(trios.length).toBe(2);
        });

        it('should create 6 quads for 12 players (total 6 battles)', () => {
            const playerIds = Array.from({ length: 12 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(6);
            const quads = pairings.filter(b => b.length === 4);
            expect(quads.length).toBe(6);
        });

        it('should create 5 quads + 2 trios for 13 players (total 7 battles)', () => {
            const playerIds = Array.from({ length: 13 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(7);
            const quads = pairings.filter(b => b.length === 4);
            const trios = pairings.filter(b => b.length === 3);
            expect(quads.length).toBe(5);
            expect(trios.length).toBe(2);
        });

        it('should create 7 quads (4-way brawls) for 14 players (total 7 battles)', () => {
            const playerIds = Array.from({ length: 14 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(7);
            const quads = pairings.filter(b => b.length === 4);
            expect(quads.length).toBe(7);
        });

        it('should rotate trio participants fairly across rounds for 11 players', () => {
            const playerIds = Array.from({ length: 11 }, (_, i) => `p_${i + 1}`);
            const trioPlayersRound1 = new Set(generateBattlePairings(playerIds, 1).filter(b => b.length === 3).flat());
            const trioPlayersRound2 = new Set(generateBattlePairings(playerIds, 2).filter(b => b.length === 3).flat());
            const trioPlayersRound3 = new Set(generateBattlePairings(playerIds, 3).filter(b => b.length === 3).flat());

            // Check that different rounds rotate the trio players
            expect(trioPlayersRound1.size).toBeGreaterThanOrEqual(5);
            expect(trioPlayersRound2.size).toBeGreaterThanOrEqual(5);
            expect(trioPlayersRound3.size).toBeGreaterThanOrEqual(5);
            const combinedTrioPlayers = new Set([...trioPlayersRound1, ...trioPlayersRound2, ...trioPlayersRound3]);
            expect(combinedTrioPlayers.size).toBeGreaterThanOrEqual(8);
        });

        it('rotates opponent pairs across rounds for 4 through 14 players (including N=4 and N=6, fixing B6)', () => {
            const pairSetForRound = (pairings) => {
                const set = new Set();
                pairings.forEach(group => {
                    for (let i = 0; i < group.length; i++) {
                        for (let j = i + 1; j < group.length; j++) {
                            const a = group[i];
                            const b = group[j];
                            set.add(a < b ? `${a}|${b}` : `${b}|${a}`);
                        }
                    }
                });
                return set;
            };

            for (let count = 4; count <= 14; count++) {
                const playerIds = Array.from({ length: count }, (_, i) => `p_${i + 1}`);
                const r1 = pairSetForRound(generateBattlePairings(playerIds, 1));
                const r2 = pairSetForRound(generateBattlePairings(playerIds, 2));
                const r3 = pairSetForRound(generateBattlePairings(playerIds, 3));

                // Pair sets must differ across consecutive rounds for all N in [4, 14]
                expect([...r1].sort().join(',')).not.toBe([...r2].sort().join(','));
                expect([...r2].sort().join(',')).not.toBe([...r3].sort().join(','));

                // For 2-player duos (N <= 8), each round has exactly N distinct pairs
                if (count <= 8) {
                    expect(r1.size).toBe(count);
                    expect(r2.size).toBe(count);
                    expect(r3.size).toBe(count);
                }

                // For N in [5, 8], Round 1 and Round 2 should be 100% edge-disjoint (0 repeated pairs)
                if (count >= 5 && count <= 8) {
                    const overlap12 = [...r1].filter(p => r2.has(p));
                    expect(overlap12).toHaveLength(0);
                }

                // For N = 4, all 6 possible pairs must be covered across the 3 rounds
                if (count === 4) {
                    const allCovered = new Set([...r1, ...r2, ...r3]);
                    expect(allCovered.size).toBe(6);
                }
            }
        });
    });
});
