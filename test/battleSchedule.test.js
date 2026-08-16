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

        it('should create 6 trios (0 duos) for 9 players (total 6 battles)', () => {
            const playerIds = Array.from({ length: 9 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(6);
            const trios = pairings.filter(b => b.length === 3);
            const duos = pairings.filter(b => b.length === 2);
            expect(trios.length).toBe(6);
            expect(duos.length).toBe(0);
        });

        it('should create 6 trios + 1 duo for 10 players (total 7 battles)', () => {
            const playerIds = Array.from({ length: 10 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(7);
            const trios = pairings.filter(b => b.length === 3);
            const duos = pairings.filter(b => b.length === 2);
            expect(trios.length).toBe(6);
            expect(duos.length).toBe(1);
        });

        it('should create 6 trios + 2 duos for 11 players (total 8 battles)', () => {
            const playerIds = Array.from({ length: 11 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(8);
            const trios = pairings.filter(b => b.length === 3);
            const duos = pairings.filter(b => b.length === 2);
            expect(trios.length).toBe(6);
            expect(duos.length).toBe(2);
        });

        it('should create 8 trios (0 duos) for 12 players (total 8 battles)', () => {
            const playerIds = Array.from({ length: 12 }, (_, i) => `p_${i + 1}`);
            const pairings = generateBattlePairings(playerIds, 1);
            expect(pairings.length).toBe(8);
            const trios = pairings.filter(b => b.length === 3);
            const duos = pairings.filter(b => b.length === 2);
            expect(trios.length).toBe(8);
            expect(duos.length).toBe(0);
        });

        it('should rotate duo participants fairly across rounds for 11 players', () => {
            const playerIds = Array.from({ length: 11 }, (_, i) => `p_${i + 1}`);
            const duoPlayersRound1 = new Set(generateBattlePairings(playerIds, 1).filter(b => b.length === 2).flat());
            const duoPlayersRound2 = new Set(generateBattlePairings(playerIds, 2).filter(b => b.length === 2).flat());
            const duoPlayersRound3 = new Set(generateBattlePairings(playerIds, 3).filter(b => b.length === 2).flat());

            // Check that different rounds rotate the duo players
            expect(duoPlayersRound1.size).toBe(4);
            expect(duoPlayersRound2.size).toBe(4);
            expect(duoPlayersRound3.size).toBe(4);
            // The union of duo players across 3 rounds should cover most/all players
            const combinedDuoPlayers = new Set([...duoPlayersRound1, ...duoPlayersRound2, ...duoPlayersRound3]);
            expect(combinedDuoPlayers.size).toBeGreaterThanOrEqual(8);
        });
    });
});
