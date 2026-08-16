import { describe, it, expect } from 'vitest';
import { getPrompt } from '../geminiService.js';
import { PROMPT_VERSION } from '../src/lib/config.js';

describe('Gemini Prompt Engine & Versioning (v1 vs v2)', () => {
    it('should default to PROMPT_VERSION v2', () => {
        expect(PROMPT_VERSION).toBe('v2');
    });

    describe('v1 Prompt Templates (Classic / Legacy)', () => {
        it('should load v1 themes prompt and replace placeholders', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'fun party themes' }, 'v1');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('fun party themes');
            expect(prompt).not.toContain('${themeTypeInstruction}');
            expect(prompt).toContain('3 Distinct Scenario Archetypes');
        });

        it('should load v1 roundData prompt and replace placeholders', async () => {
            const replacements = {
                numPlayers: '4',
                theme: 'Space Pirates',
                languageFullName: 'English',
                sillyMode: 'OFF',
                is18PlusMode: 'OFF',
                numQuestionSetsToGenerate: '6',
                numQuestionsPerPlayer: '3',
                playerQuestionInstructions: 'Test player questions',
                battlePromptToneInstruction: 'Test tone',
                battlePromptStructureInstruction: 'Test structure',
                numBattlePrompts: '4'
            };
            const prompt = await getPrompt('roundData', replacements, 'v1');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Space Pirates');
            expect(prompt).toContain('Test player questions');
            expect(prompt).not.toContain('${theme}');
            expect(prompt).not.toContain('${numPlayers}');
        });

        it('should load v1 finalRound prompt and replace placeholders', async () => {
            const replacements = {
                theme: 'Haunted Mansion',
                languageFullName: 'Ukrainian',
                toneInstruction: 'Funny and absurd',
                numPrompts: '2'
            };
            const prompt = await getPrompt('finalRound', replacements, 'v1');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Haunted Mansion');
            expect(prompt).toContain('Ukrainian');
            expect(prompt).toContain('Funny and absurd');
            expect(prompt).not.toContain('${theme}');
        });
    });

    describe('v2 Prompt Templates (Streamlined / Situational)', () => {
        it('should load v2 themes prompt and contain updated guidelines', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'high-energy party themes' }, 'v2');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('high-energy party themes');
            expect(prompt).not.toContain('${themeTypeInstruction}');
            expect(prompt).toContain('Natural Ukrainian Phrasing');
        });

        it('should load v2 roundData prompt with open-ended situational battle rules', async () => {
            const replacements = {
                numPlayers: '6',
                theme: 'Worst Restaurant in Town',
                languageFullName: 'Ukrainian',
                sillyMode: 'OFF',
                is18PlusMode: 'OFF',
                numQuestionSetsToGenerate: '8',
                numQuestionsPerPlayer: '4',
                playerQuestionInstructions: 'Reaction based micro-scenarios',
                battlePromptToneInstruction: 'Funny restaurant situations',
                battlePromptStructureInstruction: 'Phrase prompts ending with a colon (:)',
                numBattlePrompts: '6'
            };
            const prompt = await getPrompt('roundData', replacements, 'v2');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Worst Restaurant in Town');
            expect(prompt).toContain('STRICT RULE: Do NOT use fill-in-the-blank blanks');
            expect(prompt).toContain('fallbackWords');
            expect(prompt).not.toContain('${theme}');
        });

        it('should load v2 finalRound prompt with 1-sentence premise rule', async () => {
            const replacements = {
                theme: 'Cyberpunk Detective',
                languageFullName: 'English',
                toneInstruction: 'Absurd action comedy',
                numPrompts: '3'
            };
            const prompt = await getPrompt('finalRound', replacements, 'v2');
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Cyberpunk Detective');
            expect(prompt).toContain('exactly ONE clear, funny, high-concept sentence');
            expect(prompt).not.toContain('${theme}');
        });
    });

    describe('Fallback & Default Resolution', () => {
        it('should resolve to v2 when no explicit version is passed', async () => {
            const prompt = await getPrompt('themes', { themeTypeInstruction: 'default test' });
            expect(prompt).toContain('default test');
            expect(prompt).toContain('Natural Ukrainian Phrasing');
        });
    });
});
