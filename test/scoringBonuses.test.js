import { describe, it, expect } from 'vitest';
import { calculateBattlePoints } from '../game/services/battleService.js';
import { 
    POINTS_PER_VOTE, 
    VICTORY_BONUS_PER_ROUND, 
    CLEAN_SWEEP_BONUS_PER_ROUND, 
    FLAT_ROYALTY_PER_ROUND, 
    RAINBOW_BONUS_PER_ROUND 
} from '../src/lib/config.js';

describe('Scoring Algorithms, 4-Player Battles, Royalties & Rainbow Bonuses', () => {
    function createMockGame(round = 1, playerCount = 4) {
        const players = Array.from({ length: playerCount }, (_, i) => ({
            id: `p${i + 1}`,
            name: `Player ${i + 1}`,
            score: 0
        }));

        return {
            id: 'TEST',
            currentRound: round,
            players,
            battleSchedule: []
        };
    }

    describe('4-Player Battle Voting Outcomes', () => {
        it('calculates 4-player 2-0 unanimous vote with Clean Sweep bonus in Round 1', () => {
            const game = createMockGame(1, 4); // p1, p2 competing; p3, p4 voting
            const battle = {
                id: 'b1',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'An amazing answer here',
                    p2: 'Another decent answer here'
                },
                votes: {
                    p3: 'p1',
                    p4: 'p1'
                },
                wordBanks: { p1: [], p2: [] }
            };

            calculateBattlePoints(game, battle);

            // In Round 1:
            // p1 gets: 2 votes * 300 + 200 (win) + 150 (clean sweep) = 950
            // p2 gets: 0 votes = 0
            expect(battle.winnerId).toBe('p1');
            expect(battle.pointsAwarded['p1']).toBe(950);
            expect(battle.pointsAwarded['p2']).toBe(0);
            expect(game.players.find(p => p.id === 'p1').score).toBe(950);
            expect(game.players.find(p => p.id === 'p2').score).toBe(0);
        });

        it('calculates 4-player 1-1 split tie with split victory bonus and NO clean sweep in Round 1', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b2',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'First good answer',
                    p2: 'Second good answer'
                },
                votes: {
                    p3: 'p1',
                    p4: 'p2'
                },
                wordBanks: { p1: [], p2: [] }
            };

            calculateBattlePoints(game, battle);

            // In Round 1 tie:
            // winBonus (200) split evenly = 100 each
            // p1: 1 vote * 300 + 100 = 400
            // p2: 1 vote * 300 + 100 = 400
            expect(battle.winnerId).toBeNull();
            expect(battle.pointsAwarded['p1']).toBe(400);
            expect(battle.pointsAwarded['p2']).toBe(400);
        });

        it('scales points appropriately in Round 2 and Round 3', () => {
            // Test Round 2 (points per vote = 600, win = 400, sweep = 300)
            const gameR2 = createMockGame(2, 4);
            const battleR2 = {
                id: 'b_r2',
                competitors: ['p1', 'p2'],
                answers: { p1: 'Super Round 2 Answer', p2: 'Decent Round 2' },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: { p1: [], p2: [] }
            };
            calculateBattlePoints(gameR2, battleR2);
            // 2 * 600 + 400 + 300 = 1900
            expect(battleR2.pointsAwarded['p1']).toBe(1900);

            // Test Round 3 (points per vote = 1200, win = 800, sweep = 600)
            const gameR3 = createMockGame(3, 4);
            const battleR3 = {
                id: 'b_r3',
                competitors: ['p1', 'p2'],
                answers: { 
                    p1: { title: 'Movie Title', tagline: 'Movie Tagline' }, 
                    p2: { title: 'Other Title', tagline: 'Other Tagline' } 
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: { p1: [], p2: [] }
            };
            calculateBattlePoints(gameR3, battleR3);
            // 2 * 1200 + 800 + 600 = 3800
            expect(battleR3.pointsAwarded['p1']).toBe(3800);
        });
    });

    describe('Word Usage Royalties (Word Authorship Bonuses)', () => {
        it('awards flat royalties to original word authors when answer receives votes', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_royalty',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'The flying toaster exploded spectacularly',
                    p2: 'Simple boring answer'
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'flying', authorId: 'p2' },
                        { text: 'toaster', authorId: 'p2' },
                        { text: 'exploded', authorId: 'p3' },
                        { text: 'spectacularly', authorId: 'p4' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // p1 used words authored by p2, p3, p4
            // Each author gets FLAT_ROYALTY_PER_ROUND[0] = 50 pts
            expect(game.players.find(p => p.id === 'p2').score).toBe(50);
            expect(game.players.find(p => p.id === 'p3').score).toBe(50);
            expect(game.players.find(p => p.id === 'p4').score).toBe(50);

            // Battle royalties records
            expect(battle.royalties).toHaveLength(3);
            expect(battle.royalties.some(r => r.authorId === 'p2' && r.points === 50)).toBe(true);
            expect(battle.royalties.some(r => r.authorId === 'p3' && r.points === 50)).toBe(true);
            expect(battle.royalties.some(r => r.authorId === 'p4' && r.points === 50)).toBe(true);
        });

        it('does NOT award royalties if the answer receives 0 votes', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_no_votes',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'Losing answer with borrowed words',
                    p2: 'Winning answer'
                },
                votes: { p3: 'p2', p4: 'p2' },
                wordBanks: {
                    p1: [
                        { text: 'borrowed', authorId: 'p3' },
                        { text: 'words', authorId: 'p4' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // p1 received 0 votes, so p3 and p4 get NO royalties from p1's answer
            expect(game.players.find(p => p.id === 'p3').score).toBe(0);
            expect(game.players.find(p => p.id === 'p4').score).toBe(0);
        });
        it('does NOT award duplicate royalties if multiple words from the same author are used', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_multi_words_same_author',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'Alpha beta gamma delta epsilon',
                    p2: 'Losing answer'
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'alpha', authorId: 'p2' },
                        { text: 'beta', authorId: 'p2' },
                        { text: 'gamma', authorId: 'p2' },
                        { text: 'delta', authorId: 'p2' },
                        { text: 'epsilon', authorId: 'p2' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // p2 contributed 5 words, but should receive flat royalty ONCE (50 pts, not 250 pts)
            expect(game.players.find(p => p.id === 'p2').score).toBe(50);
            expect(battle.royalties).toHaveLength(1);
            expect(battle.royalties[0]).toEqual({
                authorId: 'p2',
                authorName: 'Player 2',
                usedBy: 'p1',
                points: 50
            });
        });

        it('awards royalties to authors from multiple competing answers in the same battle', () => {
            const game = createMockGame(1, 6);
            const battle = {
                id: 'b_multi_comp_royalties',
                competitors: ['p1', 'p2', 'p3'],
                answers: {
                    p1: 'Answer using words from p4',
                    p2: 'Answer using words from p5 and p6',
                    p3: 'Unused words'
                },
                votes: { p4: 'p1', p5: 'p2', p6: 'p2' },
                wordBanks: {
                    p1: [{ text: 'words', authorId: 'p4' }],
                    p2: [{ text: 'words', authorId: 'p5' }, { text: 'and', authorId: 'p6' }],
                    p3: []
                }
            };

            calculateBattlePoints(game, battle);

            // p4 earned royalty from p1's vote (50 pts)
            expect(game.players.find(p => p.id === 'p4').score).toBe(50);
            // p5 and p6 earned royalties from p2's votes (50 pts each)
            expect(game.players.find(p => p.id === 'p5').score).toBe(50);
            expect(game.players.find(p => p.id === 'p6').score).toBe(50);
        });
    });

    describe('Rainbow Variety Bonus', () => {
        it('awards Rainbow Bonus (+100 in R1) when an answer combines words from 3+ distinct other authors', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_rainbow',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'Quantum laser penguin strikes back',
                    p2: 'Normal answer'
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'quantum', authorId: 'p2' },
                        { text: 'laser', authorId: 'p3' },
                        { text: 'penguin', authorId: 'p4' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // p1 gets:
            // 2 votes * 300 = 600
            // winBonus = 200
            // sweepBonus = 150
            // Rainbow Bonus = 100
            // Total = 1050
            expect(battle.pointsAwarded['p1']).toBe(1050);
            expect(game.players.find(p => p.id === 'p1').score).toBe(1050);
        });

        it('scales Rainbow Bonus in Round 2 (+200) and Round 3 (+400)', () => {
            // Round 2
            const gameR2 = createMockGame(2, 5);
            const battleR2 = {
                id: 'b_rainbow_r2',
                competitors: ['p1', 'p2'],
                answers: { p1: 'Cybernetic space dragon unleashed', p2: 'Other answer' },
                votes: { p3: 'p1', p4: 'p1', p5: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'cybernetic', authorId: 'p3' },
                        { text: 'space', authorId: 'p4' },
                        { text: 'dragon', authorId: 'p5' }
                    ],
                    p2: []
                }
            };
            calculateBattlePoints(gameR2, battleR2);
            // 3 votes * 600 (1800) + win (400) + sweep (300) + rainbow R2 (200) = 2700
            expect(battleR2.pointsAwarded['p1']).toBe(2700);

            // Round 3 (Final Round Movie Title & Tagline object)
            const gameR3 = createMockGame(3, 5);
            const battleR3 = {
                id: 'b_rainbow_r3',
                competitors: ['p1', 'p2'],
                answers: { 
                    p1: { title: 'Galactic Detective', tagline: 'Solving crimes across dimensions' }, 
                    p2: { title: 'Normal Movie', tagline: 'Regular tagline' } 
                },
                votes: { p3: 'p1', p4: 'p1', p5: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'galactic', authorId: 'p3' },
                        { text: 'crimes', authorId: 'p4' },
                        { text: 'dimensions', authorId: 'p5' }
                    ],
                    p2: []
                }
            };
            calculateBattlePoints(gameR3, battleR3);
            // 3 votes * 1200 (3600) + win (800) + sweep (600) + rainbow R3 (400) = 5400
            expect(battleR3.pointsAwarded['p1']).toBe(5400);
            // Each author earns flat royalty in R3 = 100 pts (FLAT_ROYALTY_PER_ROUND[2])
            expect(gameR3.players.find(p => p.id === 'p3').score).toBe(100);
            expect(gameR3.players.find(p => p.id === 'p4').score).toBe(100);
            expect(gameR3.players.find(p => p.id === 'p5').score).toBe(100);
        });

        it('does NOT award Rainbow Bonus if only 2 distinct authors are used', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_no_rainbow',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'Quantum laser from two authors',
                    p2: 'Normal answer'
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'quantum', authorId: 'p2' },
                        { text: 'laser', authorId: 'p2' },
                        { text: 'from', authorId: 'p3' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // Only 2 distinct authors (p2, p3) -> NO rainbow bonus (+0)
            // Total = 600 + 200 + 150 = 950
            expect(battle.pointsAwarded['p1']).toBe(950);
        });
    });

    describe('Auto-Win and Timeout Scenarios', () => {
        it('awards full 2-vote equivalent + victory + clean sweep to single active competitor', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_autowin',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'The only submitted answer',
                    p2: '::TIMEOUT::'
                },
                votes: {},
                wordBanks: {
                    p1: [{ text: 'submitted', authorId: 'p3' }],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // Auto-win treated as 2 votes: (2 * 300) + 200 (win) + 150 (sweep) = 950
            expect(battle.winnerId).toBe('p1');
            expect(battle.pointsAwarded['p1']).toBe(950);
            expect(battle.pointsAwarded['p2']).toBe(0);
            // Royalties are also awarded in auto-win
            expect(game.players.find(p => p.id === 'p3').score).toBe(50);
        });

        it('awards 0 points if both competitors timeout', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_double_timeout',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: '::TIMEOUT::',
                    p2: '::TIMEOUT::'
                },
                votes: {},
                wordBanks: { p1: [], p2: [] }
            };

            calculateBattlePoints(game, battle);

            expect(battle.winnerId).toBeNull();
            expect(battle.pointsAwarded['p1']).toBe(0);
            expect(battle.pointsAwarded['p2']).toBe(0);
        });
    });
});
