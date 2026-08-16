import { describe, it, expect } from 'vitest';
import { FALLBACK_CONTENT, FALLBACK_WORDS } from '../game/fallbackContent.js';
import { getFallbackRoundData } from '../game/services/roundService.js';

describe('Fallback Content & Bilingual Data', () => {
    it('should provide fallback words for both English and Ukrainian', () => {
        expect(FALLBACK_WORDS.en).toBeDefined();
        expect(FALLBACK_WORDS.uk).toBeDefined();
        expect(FALLBACK_WORDS.en.length).toBeGreaterThan(10);
        expect(FALLBACK_WORDS.uk.length).toBeGreaterThan(10);
    });

    it('should have structured fallback content packs with valid battle prompts and questions', () => {
        ['en', 'uk'].forEach(lang => {
            const pack = FALLBACK_CONTENT[lang];
            expect(pack).toBeDefined();
            expect(pack.length).toBeGreaterThan(0);

            pack.forEach(item => {
                expect(item.theme).toBeTypeOf('string');
                expect(item.battlePrompts.length).toBeGreaterThan(0);
                expect(item.playerQuestions.length).toBeGreaterThan(0);
            });
        });
    });

    it('should retrieve fresh fallback round data without repeating recently used themes', () => {
        const usedThemes = [];
        const round1 = getFallbackRoundData('en', usedThemes);
        expect(round1).toBeDefined();
        expect(round1.theme).toBeDefined();

        usedThemes.push(round1.theme);
        const round2 = getFallbackRoundData('en', usedThemes);
        expect(round2).toBeDefined();
        expect(round2.theme).not.toBe(round1.theme);
    });
});
