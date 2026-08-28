import { describe, it, expect } from 'vitest';
import {
    shuffleArray,
    generateGameId,
    generatePlayerId,
    generatePlayerToken,
    getSanitizedGameState,
    getChunksFromText,
    tokenizeText,
    formatAnswerText
} from '../game/helpers.js';

describe('Game Helper Functions', () => {
    describe('shuffleArray', () => {
        it('should shuffle array in-place while keeping all elements', () => {
            const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const toShuffle = [...original];
            const result = shuffleArray(toShuffle);

            expect(result).toHaveLength(original.length);
            expect(result.sort()).toEqual(original.sort());
        });

        it('should handle empty and single-element arrays', () => {
            expect(shuffleArray([])).toEqual([]);
            expect(shuffleArray([42])).toEqual([42]);
        });
    });

    describe('ID and Token Generation', () => {
        it('should generate 4-character uppercase game IDs', () => {
            const id = generateGameId();
            expect(id).toBeDefined();
            expect(id.length).toBe(4);
            expect(id).toMatch(/^[A-Z0-9]{4}$/);
        });

        it('should generate unique player IDs and tokens', () => {
            const id1 = generatePlayerId();
            const id2 = generatePlayerId();
            const token1 = generatePlayerToken();
            const token2 = generatePlayerToken();

            expect(id1).not.toBe(id2);
            expect(token1).not.toBe(token2);
            expect(typeof token1).toBe('string');
            expect(token1.length).toBeGreaterThan(10);
        });
    });

    describe('getSanitizedGameState', () => {
        it('should return null for non-existent game', () => {
            expect(getSanitizedGameState(null)).toBeNull();
            expect(getSanitizedGameState(undefined)).toBeNull();
        });

        it('should strip private player tokens and only expose safe fields', () => {
            const mockGame = {
                id: 'ABCD',
                serverIP: '127.0.0.1',
                language: 'en',
                phase: 'lobby',
                isPaused: false,
                currentRound: 1,
                currentVotingBattleIndex: 0,
                phaseEndTime: null,
                theme: 'Space Adventure',
                colorTheme: 'arcade',
                sillyMode: false,
                is18PlusMode: false,
                slowpokeMode: false,
                soundsOnHostOnly: false,
                isGeneratingThemes: false,
                players: [
                    {
                        id: 'player1',
                        name: 'Alice',
                        avatar: 'cat',
                        socketId: 'sock123',
                        score: 100,
                        isHost: true,
                        token: 'SUPER_SECRET_TOKEN_DO_NOT_EXPOSE'
                    }
                ],
                preGeneratedThemes: { en: ['Space'], uk: ['Космос'] },
                playerAnswers: { player1: { questions: [] } },
                battleSchedule: [],
                finalRoundPrompts: [],
                hostVoted: false
            };

            const sanitized = getSanitizedGameState(mockGame);

            expect(sanitized).toBeDefined();
            expect(sanitized.id).toBe('ABCD');
            expect(sanitized.players).toHaveLength(1);
            expect(sanitized.players[0].token).toBeUndefined();
            expect(sanitized.players[0].name).toBe('Alice');
            expect(sanitized.players[0].score).toBe(100);
            expect(sanitized.phaseTimer).toBe(0);
        });

        it('should calculate remaining phase countdown timer accurately', () => {
            const now = Date.now();
            const mockGame = {
                id: 'TEST',
                phase: 'answering',
                isPaused: false,
                players: [],
                phaseEndTime: now + 30000 // 30 seconds from now
            };

            const sanitized = getSanitizedGameState(mockGame);
            expect(sanitized.phaseTimer).toBeGreaterThanOrEqual(29);
            expect(sanitized.phaseTimer).toBeLessThanOrEqual(30);
        });
    });

    describe('Text Processing & Clause Chunking', () => {
        it('should split sentences into grammatical clause bundles by conjunctions and punctuation', () => {
            const text = "I woke up late, because my flying toaster exploded on the highway.";
            const chunks = getChunksFromText(text);
            
            expect(chunks.length).toBeGreaterThanOrEqual(2);
            expect(chunks.some(c => c.toLowerCase().includes('i woke up late'))).toBe(true);
            expect(chunks.some(c => c.toLowerCase().includes('toaster exploded'))).toBe(true);
        });

        it('should handle Ukrainian conjunctions and punctuation cleanly even without commas', () => {
            const text = "Я запізнився бо мій кіт захворів і не хотів їсти.";
            const chunks = getChunksFromText(text);
            
            expect(chunks.length).toBeGreaterThanOrEqual(2);
            expect(chunks.some(c => c.includes('запізнився'))).toBe(true);
            expect(chunks.some(c => c.includes('захворів'))).toBe(true);
        });

        it('should produce single-word atomic tokens with tokenizeText', () => {
            const tokens = tokenizeText("Hello world, this is a test!");
            expect(tokens).toContain('Hello');
            expect(tokens).toContain('world');
            expect(tokens).toContain('test');
            // Every token must be atomic (no whitespace embedded inside tokens)
            tokens.forEach(tok => {
                expect(tok.includes(' ')).toBe(false);
            });
        });

        it('should format answer text with natural typographic spacing before punctuation', () => {
            expect(formatAnswerText('Hello !')).toBe('Hello!');
            expect(formatAnswerText('Wait , really ?')).toBe('Wait, really?');
            expect(formatAnswerText('Secret: " amazing " !')).toBe('Secret: "amazing"!');
        });
    });
});

