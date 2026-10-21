// e2e/captureHostScreenshots.spec.js
import { test } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/nikku/.gemini/antigravity/brain/384590c5-3b22-4f96-89e2-7e50f2b5b4c3';

const CAPTURES = [
    { screen: 'host_lobby', vp: { width: 1366, height: 768 }, filename: 'host_lobby_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_question', vp: { width: 1366, height: 768 }, filename: 'host_question_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_voting', vp: { width: 1366, height: 768 }, filename: 'host_voting_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_reveal', vp: { width: 1366, height: 768 }, filename: 'host_reveal_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_podium', vp: { width: 1366, height: 768 }, filename: 'host_podium_laptop.png', players: 6, lang: 'en' },
    
    { screen: 'host_lobby', vp: { width: 1228, height: 691 }, filename: 'host_lobby_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_question', vp: { width: 1228, height: 691 }, filename: 'host_question_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_voting', vp: { width: 1228, height: 691 }, filename: 'host_voting_scaled_laptop.png', players: 14, lang: 'ua' },
    { screen: 'host_reveal', vp: { width: 1228, height: 691 }, filename: 'host_reveal_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_podium', vp: { width: 1228, height: 691 }, filename: 'host_podium_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'player_lobby', vp: { width: 375, height: 667 }, filename: 'mobile_player_lobby_ua_375.png', players: 6, lang: 'ua', viewportMode: 'mobile' },
    { screen: 'player_lobby', vp: { width: 375, height: 667 }, filename: 'mobile_player_lobby_nonhost_375.png', players: 6, lang: 'en', viewportMode: 'mobile', pIndex: 1 },
];

test.describe('Capture Host UI Screenshots', () => {
    for (const cap of CAPTURES) {
        test(`Capture ${cap.filename}`, async ({ page }) => {
            await page.setViewportSize(cap.vp);
            const vpParam = cap.viewportMode || 'full';
            const pIdxParam = cap.pIndex !== undefined ? `&pIndex=${cap.pIndex}` : '';
            const url = `/?debug=${cap.screen}&players=${cap.players}&lang=${cap.lang || 'en'}&viewport=${vpParam}&hideToolbar=1${pIdxParam}`;
            await page.goto(url);
            await page.waitForTimeout(400);

            const outPath = path.join(ARTIFACT_DIR, cap.filename);
            await page.screenshot({ path: outPath, fullPage: false });
        });
    }
});
