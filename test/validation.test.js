import { describe, it, expect } from 'vitest';
import {
    gameIdSchema,
    joinGameSchema,
    createGameSchema,
    submitAnswerSchema,
    voteSchema,
    setThemeSchema,
    setColorThemeSchema
} from '../game/validationSchemas.js';

describe('Validation Schemas (Zod)', () => {
    describe('gameIdSchema', () => {
        it('should accept valid 4-character uppercase alphanumeric game IDs', () => {
            const valid = gameIdSchema.safeParse({ gameId: 'AB12' });
            expect(valid.success).toBe(true);
        });

        it('should reject lowercase, short, or overly long game IDs', () => {
            expect(gameIdSchema.safeParse({ gameId: 'abc' }).success).toBe(false);
            expect(gameIdSchema.safeParse({ gameId: 'ABCDE' }).success).toBe(false);
            expect(gameIdSchema.safeParse({ gameId: 'ab12' }).success).toBe(false);
        });
    });

    describe('joinGameSchema', () => {
        it('should accept valid player registration with emoji avatar', () => {
            const valid = joinGameSchema.safeParse({
                gameId: 'WXYZ',
                playerName: 'Player One',
                language: 'en',
                avatar: '🤖'
            });
            expect(valid.success).toBe(true);
        });

        it('should trim and reject empty player names', () => {
            const result = joinGameSchema.safeParse({
                gameId: 'WXYZ',
                playerName: '   ',
                language: 'en',
                avatar: '🤖'
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid avatars', () => {
            const result = joinGameSchema.safeParse({
                gameId: 'WXYZ',
                playerName: 'Player One',
                language: 'en',
                avatar: 'non_existent_avatar_999'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createGameSchema', () => {
        it('should accept supported languages (en, uk)', () => {
            expect(createGameSchema.safeParse({ language: 'en' }).success).toBe(true);
            expect(createGameSchema.safeParse({ language: 'uk' }).success).toBe(true);
            expect(createGameSchema.safeParse({ language: 'es' }).success).toBe(false);
        });
    });

    describe('submitAnswerSchema', () => {
        it('should validate answer submission payloads', () => {
            const valid = submitAnswerSchema.safeParse({
                gameId: 'ABCD',
                playerId: 'player_123',
                questionId: 'q_1',
                answer: 'A funny joke answer'
            });
            expect(valid.success).toBe(true);
        });

        it('should reject answers exceeding max length', () => {
            const invalid = submitAnswerSchema.safeParse({
                gameId: 'ABCD',
                playerId: 'player_123',
                questionId: 'q_1',
                answer: 'x'.repeat(501)
            });
            expect(invalid.success).toBe(false);
        });
    });

    describe('voteSchema', () => {
        it('should validate vote submissions', () => {
            const valid = voteSchema.safeParse({
                gameId: 'ABCD',
                playerId: 'voter_id',
                battleId: 'b_1',
                voteForPlayerId: 'target_player_id'
            });
            expect(valid.success).toBe(true);
        });
    });

    describe('theme configuration schemas', () => {
        it('should accept valid color themes', () => {
            expect(setColorThemeSchema.safeParse({ gameId: 'ABCD', theme: 'arcade' }).success).toBe(true);
            expect(setColorThemeSchema.safeParse({ gameId: 'ABCD', theme: 'vaporwave' }).success).toBe(true);
            expect(setColorThemeSchema.safeParse({ gameId: 'ABCD', theme: 'outrun' }).success).toBe(true);
            expect(setColorThemeSchema.safeParse({ gameId: 'ABCD', theme: 'dark_neon' }).success).toBe(false);
        });

        it('should accept valid custom theme string', () => {
            expect(setThemeSchema.safeParse({ gameId: 'ABCD', theme: 'Medieval Pirates' }).success).toBe(true);
        });
    });
});
