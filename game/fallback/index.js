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
 * Retrieves shuffled fallback movie poster prompts for final round battles.
 * @param {'en' | 'ua' | 'uk'} language 
 * @param {number} count 
 * @returns {Array<{genre: string, premise: string}>}
 */
export function getFallbackFinalRoundPrompts(language = 'en', count = 4) {
    const langKey = (language === 'ua' || language === 'uk' || language === 'Ukrainian') ? 'uk' : 'en';
    const pool = FALLBACK_FINAL_ROUND_PROMPTS[langKey] || FALLBACK_FINAL_ROUND_PROMPTS.en;
    
    // Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // If more prompts requested than available, cycle through
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(shuffled[i % shuffled.length]);
    }
    return results;
}
