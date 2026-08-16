import { describe, it, expect } from 'vitest';
import { calculateGameSuperlatives } from '../game/services/gameService.js';
import { generateBattleSchedule } from '../game/services/battleService.js';
import { handleRerollQuestion } from '../game/handlers/gameplayHandlers.js';
import * as manager from '../game/manager.js';

describe('Superlatives, FormatConfig & Question Re-Roll Mechanics', () => {
    describe('calculateGameSuperlatives', () => {
        it('calculates Ammo Factory, Rainbow Alchemist, Clean Sweeper, Minimalist, and Shakespeare accurately', () => {
            const mockGame = {
                players: [
                    { id: 'p1', name: 'Alice', score: 1000 },
                    { id: 'p2', name: 'Bob', score: 800 },
                    { id: 'p3', name: 'Charlie', score: 600 }
                ],
                battleHistory: [
                    {
                        id: 'b-1-0',
                        winnerId: 'p1',
                        answers: {
                            p1: 'I love cats and dogs.',
                            p2: 'Super gigantic robotic laser dinosaur flying above trees.'
                        },
                        royalties: [
                            { authorId: 'p3', recipientId: 'p1', royalty: 100 },
                            { authorId: 'p3', recipientId: 'p1', royalty: 50 }
                        ],
                        scoreBreakdown: {
                            p1: { rainbowBonus: 200, sweepBonus: 150 },
                            p2: { rainbowBonus: 0, sweepBonus: 0 }
                        }
                    }
                ],
                battleSchedule: [
                    {
                        id: 'b-2-0',
                        winnerId: 'p2',
                        answers: {
                            p1: 'Short win',
                            p2: { title: 'The Ultimate Epic Saga Across Infinite Galaxies', tagline: 'A truly extraordinary adventure that never ends' }
                        },
                        royalties: [
                            { authorId: 'p1', recipientId: 'p2', royalty: 75 }
                        ],
                        scoreBreakdown: {
                            p1: { rainbowBonus: 0, sweepBonus: 0 },
                            p2: { rainbowBonus: 200, sweepBonus: 300 }
                        }
                    }
                ]
            };

            const superlatives = calculateGameSuperlatives(mockGame);

            // Ammo Factory: p3 earned 150 royalties total
            expect(superlatives.ammoFactory).toBeDefined();
            expect(superlatives.ammoFactory.playerId).toBe('p3');
            expect(superlatives.ammoFactory.value).toBe(150);

            // Clean Sweeper: p1 and p2 both have sweeps
            expect(superlatives.cleanSweeper).toBeDefined();

            // Rainbow Alchemist: p1 and p2 both have 1
            expect(superlatives.rainbowAlchemist).toBeDefined();

            // Minimalist: shortest winning answer is 'I love cats and dogs.' (5 words)
            expect(superlatives.minimalist).toBeDefined();
            expect(superlatives.minimalist.playerId).toBe('p1');

            // Shakespeare: longest winning answer is p2 movie answer
            expect(superlatives.shakespeare).toBeDefined();
            expect(superlatives.shakespeare.playerId).toBe('p2');
        });
    });

    describe('generateBattleSchedule with FormatConfig', () => {
        it('attaches data-driven single_line formatConfig for regular rounds', () => {
            const game = {
                id: 'TEST',
                currentRound: 1,
                players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
                playerAnswers: { p1: {}, p2: {}, p3: {} }
            };
            const prompts = ['Slogan for a bad gym:'];
            generateBattleSchedule(game, prompts, false);

            expect(game.battleSchedule).toHaveLength(3);
            game.battleSchedule.forEach(battle => {
                expect(battle.formatConfig).toBeDefined();
                expect(battle.formatConfig.formatType).toBe('single_line');
                expect(battle.formatConfig.lines).toHaveLength(1);
                expect(battle.formatConfig.lines[0].id).toBe('main');
            });
        });

        it('attaches data-driven multi_line formatConfig for final movie round', () => {
            const game = {
                id: 'TEST',
                currentRound: 3,
                players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
                playerAnswers: { p1: {}, p2: {}, p3: {} }
            };
            const finalPrompts = [
                { genre: 'Sci-Fi Comedy', premise: 'A hamster invents time travel.' },
                { genre: 'Action Thriller', premise: 'Secret agents in a supermarket.' },
                { genre: 'Chaotic Romance', premise: 'Two aliens fall in love.' }
            ];
            generateBattleSchedule(game, finalPrompts, true);

            expect(game.battleSchedule).toHaveLength(3);
            game.battleSchedule.forEach(battle => {
                expect(battle.formatConfig).toBeDefined();
                expect(battle.formatConfig.formatType).toBe('multi_line');
                expect(battle.formatConfig.lines).toHaveLength(2);
                expect(battle.formatConfig.lines[0].id).toBe('title');
                expect(battle.formatConfig.lines[1].id).toBe('tagline');
            });
        });
    });

    describe('handleRerollQuestion', () => {
        it('swaps question with reserve and decrements rerollsLeft', () => {
            const mockIo = { to: () => ({ emit: () => {} }) };
            const mockSocket = {};
            const gameId = 'RROL';
            const game = {
                id: gameId,
                language: 'en',
                phase: 'question',
                players: [{ id: 'p1', name: 'Alice', socketId: 's1' }],
                playerAnswers: {
                    p1: {
                        questions: [
                            { id: 'q-1-0-p1', text: 'Old boring question', answer: '' }
                        ],
                        rerollsLeft: 1,
                        submittedAll: false
                    }
                },
                reserveQuestions: {
                    p1: ['Brand new exciting reserve question!']
                }
            };
            manager.addGame(gameId, game);

            handleRerollQuestion(mockIo, mockSocket, {
                gameId,
                playerId: 'p1',
                questionId: 'q-1-0-p1'
            });

            expect(game.playerAnswers.p1.questions[0].text).toBe('Brand new exciting reserve question!');
            expect(game.playerAnswers.p1.rerollsLeft).toBe(0);

            // Attempting second reroll should fail
            handleRerollQuestion(mockIo, mockSocket, {
                gameId,
                playerId: 'p1',
                questionId: 'q-1-0-p1'
            });
            expect(game.playerAnswers.p1.questions[0].text).toBe('Brand new exciting reserve question!');
            expect(game.playerAnswers.p1.rerollsLeft).toBe(0);
        });
    });
});
