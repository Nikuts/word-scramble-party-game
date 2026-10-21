import { describe, it, expect } from 'vitest';
import { calculateBattlePoints } from '../game/services/battleService.js';
import { 
    POINTS_PER_ROUND, 
    VICTORY_BONUS_PER_ROUND, 
    CLEAN_SWEEP_BONUS_PER_ROUND, 
    FLAT_ROYALTY_PER_ROUND, 
    RAINBOW_BONUS_PER_ROUND 
} from '../src/lib/config.js';

describe('Scoring Algorithms (Vote-Share Pool A1, Stopwords A5, Tie Split A7)', () => {
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

    describe('Vote-Share Pool Battle Outcomes (A1)', () => {
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

            // In Round 1 (pool = 1000, win = 200, sweep = 150, totalVotes = 2 >= 2):
            // p1 gets: 1000 + 200 + 150 = 1350
            // p2 gets: 0
            expect(battle.winnerId).toBe('p1');
            expect(battle.pointsAwarded['p1']).toBe(1350);
            expect(battle.pointsAwarded['p2']).toBe(0);
            expect(game.players.find(p => p.id === 'p1').score).toBe(1350);
            expect(game.players.find(p => p.id === 'p2').score).toBe(0);
        });

        it('does NOT award Clean Sweep when totalVotes < 2 (e.g. 3-player game with 1 voter)', () => {
            const game = createMockGame(1, 3); // p1, p2 competing; only p3 voting
            const battle = {
                id: 'b_3p',
                competitors: ['p1', 'p2'],
                answers: { p1: 'Ans A', p2: 'Ans B' },
                votes: { p3: 'p1' },
                wordBanks: { p1: [], p2: [] }
            };

            calculateBattlePoints(game, battle);

            // p1 gets 100% of 1000 pool + 200 winBonus, but 0 sweepBonus because totalVotes === 1
            expect(battle.winnerId).toBe('p1');
            expect(battle.scoreBreakdown['p1'].sweepBonus).toBe(0);
            expect(battle.pointsAwarded['p1']).toBe(1200);
        });

        it('calculates 4-player 1-1 split tie with Math.floor split victory bonus and NO clean sweep in Round 1', () => {
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
            // Vote share: Math.floor((1/2) * 1000) = 500 each
            // winBonus (200) split evenly = 100 each
            // Total = 600 each
            expect(battle.winnerId).toBeNull();
            expect(battle.pointsAwarded['p1']).toBe(600);
            expect(battle.pointsAwarded['p2']).toBe(600);
        });

        it('scales pool and bonuses appropriately in Round 2 and Round 3', () => {
            // Test Round 2 (pool = 2000, win = 400, sweep = 300)
            const gameR2 = createMockGame(2, 4);
            const battleR2 = {
                id: 'b_r2',
                competitors: ['p1', 'p2'],
                answers: { p1: 'Super Round 2 Answer', p2: 'Decent Round 2' },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: { p1: [], p2: [] }
            };
            calculateBattlePoints(gameR2, battleR2);
            // 2000 + 400 + 300 = 2700
            expect(battleR2.pointsAwarded['p1']).toBe(2700);

            // Test Round 3 (pool = 4000, win = 800, sweep = 600)
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
            // 4000 + 800 + 600 = 5400
            expect(battleR3.pointsAwarded['p1']).toBe(5400);
        });
    });

    describe('Word Usage Royalties & Stopword Filtering (A5)', () => {
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

            expect(game.players.find(p => p.id === 'p2').score).toBe(50);
            expect(game.players.find(p => p.id === 'p3').score).toBe(50);
            expect(game.players.find(p => p.id === 'p4').score).toBe(50);

            expect(battle.royalties).toHaveLength(3);
            expect(battle.royalties.some(r => r.authorId === 'p2' && r.points === 50)).toBe(true);
            expect(battle.royalties.some(r => r.authorId === 'p3' && r.points === 50)).toBe(true);
            expect(battle.royalties.some(r => r.authorId === 'p4' && r.points === 50)).toBe(true);
        });

        it('excludes stopwords and connectors (e.g. "I", "a", "the", "is", "and") from royalties and Rainbow Bonus (A5)', () => {
            const game = createMockGame(1, 4);
            const battle = {
                id: 'b_stopwords',
                competitors: ['p1', 'p2'],
                answers: {
                    p1: 'I am a cat and the dog is here',
                    p2: 'Other answer'
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'I', authorId: 'p2', source: 'answer' },
                        { text: 'the', authorId: 'p3', source: 'answer' },
                        { text: 'is', authorId: 'p4', source: 'answer' },
                        { text: 'and', authorId: 'p2', source: 'answer' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // Stopwords must not award royalties or trigger Rainbow Bonus
            expect(battle.royalties).toHaveLength(0);
            expect(battle.scoreBreakdown['p1'].rainbowBonus).toBe(0);
            expect(game.players.find(p => p.id === 'p2').score).toBe(0);
            expect(game.players.find(p => p.id === 'p3').score).toBe(0);
            expect(game.players.find(p => p.id === 'p4').score).toBe(0);
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
                    p2: 'Answer using words and galaxy from p6',
                    p3: 'Unused words'
                },
                votes: { p4: 'p1', p5: 'p2', p6: 'p2' },
                wordBanks: {
                    p1: [{ text: 'words', authorId: 'p4' }],
                    p2: [{ text: 'words', authorId: 'p5' }, { text: 'galaxy', authorId: 'p6' }],
                    p3: []
                }
            };

            calculateBattlePoints(game, battle);

            expect(game.players.find(p => p.id === 'p4').score).toBe(50);
            expect(game.players.find(p => p.id === 'p5').score).toBe(50);
            expect(game.players.find(p => p.id === 'p6').score).toBe(50);
        });
    });

    describe('Rainbow Variety Bonus', () => {
        it('awards Rainbow Bonus (+100 in R1) when an answer combines non-stopword words from 3+ distinct other authors', () => {
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
            // Pool share (2/2 of 1000) = 1000
            // winBonus = 200
            // sweepBonus = 150
            // Rainbow Bonus = 100
            // Total = 1450
            expect(battle.pointsAwarded['p1']).toBe(1450);
            expect(game.players.find(p => p.id === 'p1').score).toBe(1450);

            expect(battle.scoreBreakdown['p1']).toEqual({
                votes: 2,
                votePoints: 1000,
                winBonus: 200,
                sweepBonus: 150,
                rainbowBonus: 100,
                total: 1450
            });

            expect(battle.annotatedAnswers['p1'].isFinal).toBe(false);
            const annotatedWords = battle.annotatedAnswers['p1'].words;
            expect(annotatedWords).toHaveLength(5);
            expect(annotatedWords[0]).toEqual({ text: 'Quantum', authorIndex: 0 });
            expect(annotatedWords[1]).toEqual({ text: 'laser', authorIndex: 1 });
            expect(annotatedWords[2]).toEqual({ text: 'penguin', authorIndex: 2 });
            expect(annotatedWords[3]).toEqual({ text: 'strikes', authorIndex: -1 });
            expect(annotatedWords[4]).toEqual({ text: 'back', authorIndex: -1 });
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
            // Pool (2000) + win (400) + sweep (300) + rainbow R2 (200) = 2900
            expect(battleR2.pointsAwarded['p1']).toBe(2900);

            // Round 3
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
            // Pool (4000) + win (800) + sweep (600) + rainbow R3 (400) = 5800
            expect(battleR3.pointsAwarded['p1']).toBe(5800);
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
                    p1: 'Quantum laser rocket authors',
                    p2: 'Normal answer'
                },
                votes: { p3: 'p1', p4: 'p1' },
                wordBanks: {
                    p1: [
                        { text: 'quantum', authorId: 'p2' },
                        { text: 'laser', authorId: 'p2' },
                        { text: 'rocket', authorId: 'p3' }
                    ],
                    p2: []
                }
            };

            calculateBattlePoints(game, battle);

            // Pool (1000) + win (200) + sweep (150) = 1350
            expect(battle.pointsAwarded['p1']).toBe(1350);
        });
    });

    describe('Auto-Win and Timeout Scenarios (A1)', () => {
        it('awards average pool share + victory bonus (no sweep bonus) to single active competitor so auto-win never beats a real win', () => {
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

            // Auto-win in 2-competitor battle: Math.floor(1000 / 2) + 200 (win) + 0 (sweep) = 700
            expect(battle.winnerId).toBe('p1');
            expect(battle.pointsAwarded['p1']).toBe(700);
            expect(battle.pointsAwarded['p2']).toBe(0);
            expect(battle.scoreBreakdown['p1'].sweepBonus).toBe(0);
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
