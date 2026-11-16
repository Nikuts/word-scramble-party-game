// game/fallback/index.js
import { FALLBACK_CONTENT_EN } from './en/index.js';
import { FALLBACK_CONTENT_UA } from './ua/index.js';
import { FALLBACK_WORDS } from './words.js';
import { FALLBACK_FINAL_ROUND_PROMPTS } from './finalRoundPrompts.js';

export const FALLBACK_CONTENT = {
    en: FALLBACK_CONTENT_EN,
    uk: FALLBACK_CONTENT_UA,
    ua: FALLBACK_CONTENT_UA
};

export { FALLBACK_WORDS, FALLBACK_FINAL_ROUND_PROMPTS };

/**
 * Retrieves shuffled fallback movie poster prompts for final round battles,
 * prioritizing prompts that have not yet been used across games.
 * @param {'en' | 'ua' | 'uk'} language
 * @param {number} count
 * @param {Array<string> | Set<string>} usedPrompts Keys formatted as `${genre}:${premise}`
 * @returns {Array<{genre: string, premise: string}>}
 */
export function getFallbackFinalRoundPrompts(language = 'en', count = 4, usedPrompts = []) {
    const langKey = (language === 'ua' || language === 'uk' || language === 'Ukrainian') ? 'uk' : 'en';
    const pool = FALLBACK_FINAL_ROUND_PROMPTS[langKey] || FALLBACK_FINAL_ROUND_PROMPTS.en;
    const usedSet = usedPrompts instanceof Set ? usedPrompts : new Set(usedPrompts || []);

    // Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const unseen = shuffled.filter(p => !usedSet.has(`${p.genre || ''}:${p.premise || ''}`));
    const seen = shuffled.filter(p => usedSet.has(`${p.genre || ''}:${p.premise || ''}`));
    const orderedPool = unseen.length > 0 ? [...unseen, ...seen] : shuffled;

    // If more prompts requested than available, cycle through
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(orderedPool[i % orderedPool.length]);
    }
    return results;
}
