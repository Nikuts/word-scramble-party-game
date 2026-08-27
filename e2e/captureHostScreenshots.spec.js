// e2e/captureHostScreenshots.spec.js
import { test } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/nikku/.gemini/antigravity-ide/brain/8524da66-c512-4769-b6d9-4b0a4fb99c88';

const CAPTURES = [
    { screen: 'host_lobby', vp: { width: 1366, height: 768 }, filename: 'host_lobby_laptop.png', players: 6 },
    { screen: 'host_question', vp: { width: 1366, height: 768 }, filename: 'host_question_laptop.png', players: 6 },
    { screen: 'host_voting', vp: { width: 1366, height: 768 }, filename: 'host_voting_laptop.png', players: 6 },
    { screen: 'host_reveal', vp: { width: 1366, height: 768 }, filename: 'host_reveal_laptop.png', players: 6 },
    { screen: 'host_podium', vp: { width: 1366, height: 768 }, filename: 'host_podium_laptop.png', players: 6 },
    
    { screen: 'host_lobby', vp: { width: 1228, height: 691 }, filename: 'host_lobby_scaled_laptop.png', players: 6 },
    { screen: 'host_voting', vp: { width: 1228, height: 691 }, filename: 'host_voting_scaled_laptop.png', players: 6 },
    { screen: 'host_reveal', vp: { width: 1228, height: 691 }, filename: 'host_reveal_scaled_laptop.png', players: 6 },
    { screen: 'host_podium', vp: { width: 1228, height: 691 }, filename: 'host_podium_scaled_laptop.png', players: 6 },
];

test.describe('Capture Host UI Screenshots', () => {
    for (const cap of CAPTURES) {
        test(`Capture ${cap.filename}`, async ({ page }) => {
            await page.setViewportSize(cap.vp);
            const url = `/?debug=${cap.screen}&players=${cap.players}&viewport=full&hideToolbar=1`;
            await page.goto(url);
            await page.waitForTimeout(400);

            const outPath = path.join(ARTIFACT_DIR, cap.filename);
            await page.screenshot({ path: outPath, fullPage: false });
        });
    }
});
