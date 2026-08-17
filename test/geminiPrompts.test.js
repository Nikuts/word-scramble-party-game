import { describe, it, expect } from 'vitest';
import { getPrompt } from '../geminiService.js';

describe('Language-Specific Prompt Engine (English & Ukrainian)', () => {

    describe('English Prompts (prompts/en/)', () => {
        it('should load English themes prompt and replace placeholders', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'fun party themes' }, 'en');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('fun party themes');
            expect(prompt).toContain('3 distinct archetypes');
            expect(prompt).not.toContain('${themeTypeInstruction}');
        });

        it('should load English roundData prompt and replace placeholders', async () => {
            const replacements = {
                numPlayers: '4',
                theme: 'Space Pirates',
                sillyMode: 'OFF',
                is18PlusMode: 'OFF',
                numQuestionSetsToGenerate: '6',
                numQuestionsPerPlayer: '3',
                playerQuestionInstructions: 'Test player questions',
                battlePromptToneInstruction: 'Test tone',
                battlePromptStructureInstruction: 'Test structure',
                numBattlePrompts: '4'
            };
            const prompt = await getPrompt('roundData', replacements, 'en');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Space Pirates');
            expect(prompt).toContain('Test player questions');
            expect(prompt).toContain('CRITICAL THEMATIC ANCHORING');
            expect(prompt).not.toContain('${theme}');
            expect(prompt).not.toContain('${numPlayers}');
        });

        it('should load English finalRound prompt and replace placeholders', async () => {
            const replacements = {
                theme: 'Haunted Mansion',
                toneInstruction: 'Funny and absurd',
                numPrompts: '2'
            };
            const prompt = await getPrompt('finalRound', replacements, 'en');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Haunted Mansion');
            expect(prompt).toContain('Funny and absurd');
            expect(prompt).toContain('exactly ONE clear, funny, high-concept sentence');
            expect(prompt).not.toContain('${theme}');
        });
    });

    describe('Ukrainian Prompts (prompts/ua/)', () => {
        it('should load native Ukrainian themes prompt with Ukrainian guidelines using ua code', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'яскраві теми для вечірки' }, 'ua');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('яскраві теми для вечірки');
            expect(prompt).toContain('Ви — сценарист комедійних ігор для вечірок');
            expect(prompt).toContain('3 різні архетипи');
            expect(prompt).not.toContain('${themeTypeInstruction}');
        });

        it('should also load native Ukrainian themes prompt via uk backward-compatible alias', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'тестові теми' }, 'uk');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('тестові теми');
            expect(prompt).toContain('Ви — сценарист комедійних ігор для вечірок');
        });

        it('should load native Ukrainian roundData prompt with case-safe grammar rules', async () => {
            const replacements = {
                numPlayers: '6',
                theme: 'Невдалий Ресторан',
                sillyMode: 'OFF',
                is18PlusMode: 'OFF',
                numQuestionSetsToGenerate: '8',
                numQuestionsPerPlayer: '4',
                playerQuestionInstructions: 'Мікро-ситуації',
                battlePromptToneInstruction: 'Смішні ситуації',
                battlePromptStructureInstruction: 'Конструкції з двокрапкою',
                numBattlePrompts: '6'
            };
            const prompt = await getPrompt('roundData', replacements, 'ua');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Невдалий Ресторан');
            expect(prompt).toContain('КРИТИЧНО ДЛЯ ГРАМАТИКИ УКРАЇНСЬКОЇ МОВИ');
            expect(prompt).toContain('НЕ використовуйте пропуски ("____") та прийменники');
            expect(prompt).toContain('fallbackWords');
            expect(prompt).not.toContain('${theme}');
        });

        it('should load native Ukrainian finalRound prompt with 1-sentence Ukrainian premise rule', async () => {
            const replacements = {
                theme: 'Кіберпанк Детектив',
                toneInstruction: 'Комедійний бойовик',
                numPrompts: '3'
            };
            const prompt = await getPrompt('finalRound', replacements, 'ua');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Кіберпанк Детектив');
            expect(prompt).toContain('Постер до фільму');
            expect(prompt).toContain('РІВНО ОДНИМ лаконічним, смішним реченням');
            expect(prompt).not.toContain('${theme}');
        });
    });

    describe('Fallback Resolution', () => {
        it('should default to English when no language parameter is provided', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'default test' });
            expect(prompt).toContain('default test');
            expect(prompt).toContain('comedy writer');
        });
    });
});
