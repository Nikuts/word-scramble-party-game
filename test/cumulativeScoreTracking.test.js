import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBattlePoints } from '../game/services/battleService.js';
import * as roundService from '../game/services/roundService.js';
import * as gameService from '../game/services/gameService.js';

describe('Multi-Round Cumulative Score Tracking & Preservation', () => {
    let game;

    beforeEach(() => {
        game = {
            id: 'SCORE_TEST',
            currentRound: 1,
            language: 'en',
            phase: 'battle_result_reveal',
            players: [
                { id: 'p1', name: 'Alice', score: 0 },
                { id: 'p2', name: 'Bob', score: 0 },
                { id: 'p3', name: 'Charlie', score: 0 }
            ],
            playerAnswers: {},
            battleSchedule: [],
            battleHistory: [],
            answerHistory: [],
            usedFallbackThemes: []
        };
    });

    it('cumulatively tracks scores across multiple battles within Round 1', () => {
        // Battle 1: p1 vs p2, p3 votes p1 (1 voter in 3P game -> totalVotes = 1, no sweep) -> p1 earns 1000 + 200 = 1200
        const b1 = {
            id: 'b1',
            competitors: ['p1', 'p2'],
            answers: { p1: 'Alice answer', p2: 'Bob answer' },
            votes: { p3: 'p1' },
            wordBanks: { p1: [], p2: [] }
        };
        calculateBattlePoints(game, b1);
        expect(game.players.find(p => p.id === 'p1').score).toBe(1200);
        expect(game.players.find(p => p.id === 'p2').score).toBe(0);

        // Battle 2: p2 vs p3, p1 votes p2 -> p2 earns 1200
        const b2 = {
            id: 'b2',
            competitors: ['p2', 'p3'],
            answers: { p2: 'Bob answer', p3: 'Charlie answer' },
            votes: { p1: 'p2' },
            wordBanks: { p2: [], p3: [] }
        };
        calculateBattlePoints(game, b2);
        expect(game.players.find(p => p.id === 'p2').score).toBe(1200);

        // Battle 3: p3 vs p1, p2 votes p1 -> p1 earns another 1200
        const b3 = {
            id: 'b3',
            competitors: ['p3', 'p1'],
            answers: { p3: 'Charlie answer', p1: 'Alice second answer' },
            votes: { p2: 'p1' },
            wordBanks: { p3: [], p1: [] }
        };
        calculateBattlePoints(game, b3);

        // Alice won 2 battles in Round 1 -> 1200 + 1200 = 2400
        expect(game.players.find(p => p.id === 'p1').score).toBe(2400);
        expect(game.players.find(p => p.id === 'p2').score).toBe(1200);
        expect(game.players.find(p => p.id === 'p3').score).toBe(0);
    });

    it('preserves cumulative scores across round transitions from Round 1 to Round 2 to Round 3', () => {
        // Round 1: Alice gets 1200
        const b_r1 = {
            id: 'b_r1',
            competitors: ['p1', 'p2'],
            answers: { p1: 'Ans 1', p2: 'Ans 2' },
            votes: { p3: 'p1' },
            wordBanks: { p1: [], p2: [] }
        };
        calculateBattlePoints(game, b_r1);
        expect(game.players.find(p => p.id === 'p1').score).toBe(1200);

        // Transition to Round 2 (pool 2000 + win 400 = 2400)
        game.currentRound = 2;
        const b_r2 = {
            id: 'b_r2',
            competitors: ['p1', 'p2'],
            answers: { p1: 'Ans 1 R2', p2: 'Ans 2 R2' },
            votes: { p3: 'p1' },
            wordBanks: { p1: [], p2: [] }
        };
        calculateBattlePoints(game, b_r2);
        // Alice score: 1200 (from R1) + 2400 (from R2) = 3600
        expect(game.players.find(p => p.id === 'p1').score).toBe(3600);

        // Transition to Round 3 Finale (pool 4000 + win 800 = 4800)
        game.currentRound = 3;
        const b_r3 = {
            id: 'b_r3',
            competitors: ['p1', 'p2'],
            answers: { 
                p1: { title: 'T1', tagline: 'Tag1' }, 
                p2: { title: 'T2', tagline: 'Tag2' } 
            },
            votes: { p3: 'p1' },
            wordBanks: { p1: [], p2: [] }
        };
        calculateBattlePoints(game, b_r3);
        // Alice final score: 3600 + 4800 = 8400
        expect(game.players.find(p => p.id === 'p1').score).toBe(8400);
    });

    it('correctly includes word royalties in cumulative totals for non-competing authors', () => {
        // In Round 1: Alice uses words authored by Bob (+50 royalty to Bob)
        // Alice wins battle in 3P game: 1000 + 200 = 1200
        const b1 = {
            id: 'b_royalty',
            competitors: ['p1', 'p3'],
            answers: { p1: 'Alice uses Bob words', p3: 'Charlie answer' },
            votes: { p2: 'p1' },
            wordBanks: {
                p1: [{ text: 'bob', authorId: 'p2' }],
                p3: []
            }
        };

        calculateBattlePoints(game, b1);

        expect(game.players.find(p => p.id === 'p1').score).toBe(1200);
        // Bob was not competing, but receives flat royalty of 50
        expect(game.players.find(p => p.id === 'p2').score).toBe(50);
    });

    it('maintains final sorted scores at game over without data loss or score resets', () => {
        const p1 = game.players.find(p => p.id === 'p1');
        const p2 = game.players.find(p => p.id === 'p2');
        const p3 = game.players.find(p => p.id === 'p3');

        p1.score = 4550;
        p2.score = 1950;
        p3.score = 650;

        const mockIo = {
            to: () => mockIo,
            in: () => mockIo,
            emit: () => {}
        };

        gameService.endGame(mockIo, game);

        expect(game.phase).toBe('results');
        // Sorted in descending order
        expect(game.players[0].name).toBe('Alice');
        expect(game.players[0].score).toBe(4550);
        expect(game.players[1].name).toBe('Bob');
        expect(game.players[1].score).toBe(1950);
        expect(game.players[2].name).toBe('Charlie');
        expect(game.players[2].score).toBe(650);
    });
});
