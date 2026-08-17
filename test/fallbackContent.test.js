import { describe, it, expect } from 'vitest';
import { 
    FALLBACK_CONTENT, 
    FALLBACK_WORDS, 
    FALLBACK_FINAL_ROUND_PROMPTS,
    getFallbackFinalRoundPrompts 
} from '../game/fallback/index.js';
import { getFallbackRoundData } from '../game/services/roundService.js';

describe('Fallback Content & Bilingual Data (game/fallback/)', () => {
    describe('Fallback Words & Connectors', () => {
        it('should provide fallback words for English and Ukrainian (including ua and uk aliases)', () => {
            expect(FALLBACK_WORDS.en).toBeDefined();
            expect(FALLBACK_WORDS.uk).toBeDefined();
            expect(FALLBACK_WORDS.ua).toBeDefined();
            expect(FALLBACK_WORDS.en.length).toBeGreaterThan(20);
            expect(FALLBACK_WORDS.uk.length).toBeGreaterThan(20);
        });

        it('should include high-utility connectors in both languages', () => {
            const enFlat = FALLBACK_WORDS.en.flat();
            const ukFlat = FALLBACK_WORDS.uk.flat();

            expect(enFlat).toContain('and');
            expect(enFlat).toContain('but');
            expect(enFlat).toContain('because');
            expect(enFlat).toContain('never');

            expect(ukFlat).toContain('і');
            expect(ukFlat).toContain('але');
            expect(ukFlat).toContain('бо');
            expect(ukFlat).toContain('ніколи');
        });
    });

    describe('Fallback Theme Packs & Prompt Structure', () => {
        it('should have structured fallback content packs for en, uk, and ua', () => {
            ['en', 'uk', 'ua'].forEach(lang => {
                const packs = FALLBACK_CONTENT[lang];
                expect(packs).toBeDefined();
                expect(packs.length).toBeGreaterThanOrEqual(5);

                packs.forEach(pack => {
                    expect(pack.theme).toBeTypeOf('string');
                    expect(pack.theme.length).toBeGreaterThan(0);
                    expect(pack.battlePrompts.length).toBeGreaterThanOrEqual(40);
                    expect(pack.playerQuestions.length).toBeGreaterThanOrEqual(40);
                });
            });
        });

        it('should ensure all battle prompts follow situational colon termination and avoid fill-in blanks', () => {
            ['en', 'uk'].forEach(lang => {
                const packs = FALLBACK_CONTENT[lang];
                packs.forEach(pack => {
                    pack.battlePrompts.forEach(prompt => {
                        expect(prompt.trim().length).toBeGreaterThan(5);
                        // Strict rule: No fill-in blanks
                        expect(prompt).not.toContain('____');
                        // Rule: Ends with a colon or question mark
                        const lastChar = prompt.trim().slice(-1);
                        expect([':', '?']).toContain(lastChar);
                    });
                });
            });
        });

        it('should ensure Ukrainian battle prompts avoid case-governing fill-in prepositions', () => {
            const uaPacks = FALLBACK_CONTENT.uk;
            uaPacks.forEach(pack => {
                pack.battlePrompts.forEach(prompt => {
                    expect(prompt).not.toMatch(/для\s+____/i);
                    expect(prompt).not.toMatch(/проти\s+____/i);
                    expect(prompt).not.toMatch(/через\s+____/i);
                    expect(prompt).not.toMatch(/керувати\s+____/i);
                });
            });
        });

        it('should ensure player questions are organized in triplets of micro-scenarios', () => {
            ['en', 'uk'].forEach(lang => {
                const packs = FALLBACK_CONTENT[lang];
                packs.forEach(pack => {
                    pack.playerQuestions.forEach(triplet => {
                        expect(Array.isArray(triplet)).toBe(true);
                        expect(triplet.length).toBe(3);
                        triplet.forEach(q => {
                            expect(q.trim().length).toBeGreaterThan(10);
                            const lastChar = q.trim().slice(-1);
                            expect(['?', ':', '.']).toContain(lastChar);
                        });
                    });
                });
            });
        });
    });

    describe('Final Round Movie Poster Fallback Prompts', () => {
        it('should provide bilingual movie poster prompts adhering to prompt constraints', () => {
            ['en', 'uk', 'ua'].forEach(lang => {
                const prompts = FALLBACK_FINAL_ROUND_PROMPTS[lang];
                expect(prompts).toBeDefined();
                expect(prompts.length).toBeGreaterThanOrEqual(10);

                prompts.forEach(item => {
                    expect(item.genre).toBeTypeOf('string');
                    expect(item.genre.length).toBeGreaterThan(0);
                    expect(item.genre.split(' ').length).toBeLessThanOrEqual(3);

                    expect(item.premise).toBeTypeOf('string');
                    expect(item.premise.length).toBeGreaterThan(15);
                    const words = item.premise.split(/\s+/).filter(Boolean);
                    expect(words.length).toBeLessThanOrEqual(20);
                });
            });
        });

        it('should retrieve shuffled final round fallback prompts matching requested count', () => {
            const enPrompts = getFallbackFinalRoundPrompts('en', 3);
            expect(enPrompts).toHaveLength(3);
            expect(enPrompts[0].genre).toBeDefined();
            expect(enPrompts[0].premise).toBeDefined();

            const uaPrompts = getFallbackFinalRoundPrompts('ua', 5);
            expect(uaPrompts).toHaveLength(5);
            expect(uaPrompts[0].genre).toBeDefined();
            expect(uaPrompts[0].premise).toBeDefined();
        });
    });

    describe('Round Service Integration', () => {
        it('should retrieve fresh fallback round data without repeating recently used themes', () => {
            const usedThemes = [];
            const round1 = getFallbackRoundData('en', usedThemes);
            expect(round1).toBeDefined();
            expect(round1.theme).toBeDefined();
            expect(round1.playerQuestions.length).toBeGreaterThan(0);
            expect(round1.battlePrompts.length).toBeGreaterThan(0);
            expect(round1.fallbackWords.length).toBeGreaterThan(0);

            usedThemes.push(round1.theme);
            const round2 = getFallbackRoundData('en', usedThemes);
            expect(round2).toBeDefined();
            expect(round2.theme).not.toBe(round1.theme);
        });

        it('should support Ukrainian fallback round generation', () => {
            const uaRound = getFallbackRoundData('ua', []);
            expect(uaRound).toBeDefined();
            expect(uaRound.theme).toBeDefined();
            expect(uaRound.playerQuestions.length).toBeGreaterThan(0);
            expect(uaRound.battlePrompts.length).toBeGreaterThan(0);
            expect(uaRound.fallbackWords.length).toBeGreaterThan(0);
        });
    });
});
