import { describe, it, expect, vi } from 'vitest';
import { prefetchNextRoundData, startNextRound } from '../game/services/roundService.js';
import { addGame, deleteGame } from '../game/manager.js';
import * as timerService from '../game/services/timerService.js';
import { QUESTIONS_PER_ROUND } from '../src/lib/config.js';

describe('Round Pre-fetching System', () => {
    it('should initiate prefetch for the next round index', () => {
        const mockGame = {
            id: 'TEST',
            currentRound: 1,
            language: 'en',
            theme: 'Space Adventure',
            sillyMode: false,
            is18PlusMode: false,
            geminiApiErrorCount: 0,
            players: [
                { id: 'p1', name: 'Alice' },
                { id: 'p2', name: 'Bob' },
                { id: 'p3', name: 'Charlie' }
            ]
        };

        prefetchNextRoundData(mockGame);

        expect(mockGame.prefetchedRoundPromise).toBeDefined();
    });

    it('should not prefetch if current round exceeds total rounds', () => {
        const mockGame = {
            id: 'TEST2',
            currentRound: QUESTIONS_PER_ROUND.length,
            language: 'en',
            theme: 'Space Adventure',
            players: [{ id: 'p1' }, { id: 'p2' }]
        };

        prefetchNextRoundData(mockGame);

        expect(mockGame.prefetchedRoundPromise).toBeUndefined();
    });

    it('clears prefetchedRoundPromise after settlement when prefetch yields null so future rounds can retry', async () => {
        const mockGame = {
            id: 'PREFETCH_CLEAR',
            currentRound: 0,
            phase: 'lobby',
            language: 'en',
            theme: 'Haunted Arcade',
            sillyMode: false,
            is18PlusMode: false,
            geminiApiErrorCount: 0,
            players: [
                { id: 'p1', name: 'Alice' },
                { id: 'p2', name: 'Bob' },
                { id: 'p3', name: 'Charlie' }
            ]
        };

        prefetchNextRoundData(mockGame);
        expect(mockGame.prefetchedRoundPromise).toBeTruthy();
        await mockGame.prefetchedRoundPromise;
        expect(mockGame.prefetchedRoundPromise).toBeNull();
    });

    it('prioritizes remaining on-theme prompts over static off-theme fallback packs when unseen AI prompts are short', async () => {
        const gameId = 'THEME_PRIORITY';
        const mockGame = {
            id: gameId,
            gameInstanceId: 1,
            currentRound: 0,
            phase: 'lobby',
            language: 'en',
            theme: 'Cyberpunk Bakery',
            sillyMode: false,
            is18PlusMode: false,
            slowpokeMode: false,
            geminiApiErrorCount: 0,
            usedBattlePrompts: ['Cyberpunk Bakery rule #1:', 'Cyberpunk Bakery slogan #2:'],
            usedQuestions: [],
            players: [
                { id: 'p1', name: 'Alice', socketId: 's1', score: 0 },
                { id: 'p2', name: 'Bob', socketId: 's2', score: 0 },
                { id: 'p3', name: 'Charlie', socketId: 's3', score: 0 }
            ],
            prefetchedRoundData: {
                roundIndex: 1,
                gameInstanceId: 1,
                data: {
                    playerQuestions: [
                        ['Q1 for Alice', 'Q2 for Alice'],
                        ['Q1 for Bob', 'Q2 for Bob'],
                        ['Q1 for Charlie', 'Q2 for Charlie']
                    ],
                    battlePrompts: [
                        'Cyberpunk Bakery rule #1:',
                        'Cyberpunk Bakery slogan #2:',
                        'Cyberpunk Bakery warning #3:'
                    ],
                    fallbackWords: ['neon croissant', 'chrome toaster']
                }
            }
        };

        addGame(gameId, mockGame);
        const mockIo = { to: vi.fn(() => ({ emit: vi.fn() })) };
        await startNextRound(mockIo, mockGame);
        timerService.clearPhaseTimer(mockGame);
        deleteGame(gameId);

        expect(mockGame.preGeneratedBattlePrompts).toEqual([
            'Cyberpunk Bakery warning #3:',
            'Cyberpunk Bakery rule #1:',
            'Cyberpunk Bakery slogan #2:'
        ]);
    });

    it('leaves preGeneratedBattlePrompts empty on Round 3 (Final Round) instead of backfilling off-theme static prompts', async () => {
        const gameId = 'FINAL_ROUND_NO_PAD';
        const mockGame = {
            id: gameId,
            gameInstanceId: 1,
            currentRound: QUESTIONS_PER_ROUND.length - 1, // Next round is Round 3 (Final Round)
            phase: 'battle_reveal',
            language: 'en',
            theme: 'Underwater Library',
            sillyMode: false,
            is18PlusMode: false,
            slowpokeMode: false,
            geminiApiErrorCount: 0,
            usedBattlePrompts: [],
            usedQuestions: [],
            players: [
                { id: 'p1', name: 'Alice', socketId: 's1', score: 0 },
                { id: 'p2', name: 'Bob', socketId: 's2', score: 0 },
                { id: 'p3', name: 'Charlie', socketId: 's3', score: 0 }
            ],
            prefetchedRoundData: {
                roundIndex: QUESTIONS_PER_ROUND.length,
                gameInstanceId: 1,
                data: {
                    playerQuestions: [
                        ['Final Q1 for Alice', 'Final Q2 for Alice'],
                        ['Final Q1 for Bob', 'Final Q2 for Bob'],
                        ['Final Q1 for Charlie', 'Final Q2 for Charlie']
                    ],
                    battlePrompts: [],
                    fallbackWords: ['soggy bookmark', 'whispering octopus']
                }
            }
        };

        addGame(gameId, mockGame);
        const mockIo = { to: vi.fn(() => ({ emit: vi.fn() })) };
        await startNextRound(mockIo, mockGame);
        timerService.clearPhaseTimer(mockGame);
        deleteGame(gameId);

        expect(mockGame.currentRound).toBe(QUESTIONS_PER_ROUND.length);
        expect(mockGame.preGeneratedBattlePrompts).toEqual([]);
        expect(mockGame.preGeneratedFallbackWords).toEqual(['soggy bookmark', 'whispering octopus']);
    });
});
