import { describe, it, expect } from 'vitest';
import {
    UI_TEXT,
    formatWinsLabel,
    formatWordsLabel,
    formatVotesLabel,
    formatWordsNeededLabel
} from '../src/ui_text.js';

describe('UI Text Localization & Pluralization', () => {
    it('provides complete EN & UK translations for HostGetReady, Lobby modes, and Cyrillic labels', () => {
        for (const lang of ['en', 'uk']) {
            const dict = UI_TEXT[lang];
            expect(dict.battleGetReadySubtitle).toBeTruthy();
            expect(dict.votingGetReadySubtitle).toBeTruthy();
            expect(dict.getReadyDesc).toBeTruthy();
            expect(dict.modeOn).toBeTruthy();
            expect(dict.modeOff).toBeTruthy();
            expect(dict.readyPlural).toBeTruthy();
            expect(dict.wordsShortUnit).toBeTruthy();
        }
        // Cyrillic A (U+0410), never Latin A (U+0041)
        expect(UI_TEXT.uk.answerA).toBe('Відповідь А');
        expect(UI_TEXT.uk.modeOn).toBe('УВІМК');
        expect(UI_TEXT.uk.modeOff).toBe('ВИМК');
    });

    it('formats singular, paucal, and genitive plural counts accurately in EN and UK', () => {
        expect(formatWinsLabel(1, UI_TEXT.en, 'en')).toBe('1 Win');
        expect(formatWinsLabel(2, UI_TEXT.en, 'en')).toBe('2 Wins');
        expect(formatWinsLabel(1, UI_TEXT.uk, 'uk')).toBe('1 перемога');
        expect(formatWinsLabel(3, UI_TEXT.uk, 'uk')).toBe('3 перемоги');
        expect(formatWinsLabel(5, UI_TEXT.uk, 'uk')).toBe('5 перемог');

        expect(formatWordsLabel(1, UI_TEXT.uk, 'uk')).toBe('Слово');
        expect(formatWordsLabel(21, UI_TEXT.uk, 'uk')).toBe('Слово');
        expect(formatWordsLabel(2, UI_TEXT.uk, 'uk')).toBe('Слова');
        expect(formatWordsLabel(5, UI_TEXT.uk, 'uk')).toBe('Слів');
        expect(formatWordsLabel(11, UI_TEXT.uk, 'uk')).toBe('Слів');

        expect(formatVotesLabel(0, UI_TEXT.uk, 'uk')).toBe('Голосів');
        expect(formatVotesLabel(1, UI_TEXT.uk, 'uk')).toBe('Голос');
        expect(formatVotesLabel(4, UI_TEXT.uk, 'uk')).toBe('Голоси');
        expect(formatVotesLabel(7, UI_TEXT.uk, 'uk')).toBe('Голосів');

        expect(formatWordsNeededLabel(1, UI_TEXT.uk, 'uk')).toBe('Потрібно ще 1 слово');
        expect(formatWordsNeededLabel(3, UI_TEXT.uk, 'uk')).toBe('Потрібно ще 3 слова');
        expect(formatWordsNeededLabel(5, UI_TEXT.uk, 'uk')).toBe('Потрібно ще 5 слів');
    });

    it('uses cross-device neutral wording and clean Ukrainian typography', () => {
        expect(UI_TEXT.en.tapOptionOnPhone.toLowerCase()).not.toContain('phone');
        expect(UI_TEXT.en.getReadyDesc.toLowerCase()).not.toContain('phone');
        expect(UI_TEXT.en.hostStartHint.toLowerCase()).not.toContain('phone');
        expect(UI_TEXT.en.tvOn).toBe('TV ON');
        expect(UI_TEXT.en.tvOff).toBe('TV OFF');

        expect(UI_TEXT.uk.tapOptionOnPhone.toLowerCase()).not.toContain('телефон');
        expect(UI_TEXT.uk.getReadyDesc.toLowerCase()).not.toContain('телефон');
        expect(UI_TEXT.uk.hostStartHint.toLowerCase()).not.toContain('телефон');
        expect(UI_TEXT.uk.tvOn).toBe('ТБ УВІМК');
        expect(UI_TEXT.uk.tvOff).toBe('ТБ ВИМК');
        expect(UI_TEXT.uk.waitingForPlayers).toContain('Чекаємо');
        expect(UI_TEXT.uk.backToScores).toBe('До результатів');
        expect(UI_TEXT.uk.editProfileDesc).toBeTruthy();
        expect(UI_TEXT.en.editProfileDesc).toBeTruthy();
        expect(UI_TEXT.uk.waitingForHostToRestart).toBeTruthy();
        expect(UI_TEXT.uk.youWonTheBattle).not.toContain('ПЕРЕМІГ');
        expect(UI_TEXT.uk.slowpokeMode).toBe('Повільний темп');
        for (const lang of ['en', 'uk']) {
            const dict = UI_TEXT[lang];
            for (const key of ['player', 'wordColorsLegend', 'gameFull', 'validationFailed', 'serverError', 'invalidName', 'wordBankGenerationFailed']) {
                expect(dict[key]).toBeTruthy();
            }
        }
    });
});
