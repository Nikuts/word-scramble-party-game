// e2e/captureTabletHostScreenshots.spec.js
import { test } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ARTIFACT_DIR = process.env.PLAYWRIGHT_SCREENSHOT_DIR || path.join(os.tmpdir(), 'word-scramble-screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const CAPTURES = [
    { name: 'Laptop Standard (1366x768)', screen: 'host_lobby', vp: { width: 1366, height: 768 }, filename: 'tablet_host_lobby_laptop.png' },
    { name: 'Laptop Standard (1366x768)', screen: 'host_question', vp: { width: 1366, height: 768 }, filename: 'tablet_host_question_laptop.png' },
    { name: 'Laptop Standard (1366x768)', screen: 'host_voting', vp: { width: 1366, height: 768 }, filename: 'tablet_host_voting_laptop.png' },
    { name: 'Laptop Standard (1366x768)', screen: 'host_reveal', vp: { width: 1366, height: 768 }, filename: 'tablet_host_reveal_laptop.png' },
    { name: 'Laptop Standard (1366x768)', screen: 'host_podium', vp: { width: 1366, height: 768 }, filename: 'tablet_host_podium_laptop.png' },

    { name: 'iPad Landscape (1024x768)', screen: 'host_lobby', vp: { width: 1024, height: 768 }, filename: 'host_lobby_ipad_landscape.png' },
    { name: 'iPad Portrait (768x1024)', screen: 'host_lobby', vp: { width: 768, height: 1024 }, filename: 'host_lobby_ipad_portrait.png' },
    { name: 'iPad Air Portrait (820x1180)', screen: 'host_lobby', vp: { width: 820, height: 1180 }, filename: 'host_lobby_ipad_air_portrait.png' },
    { name: 'Phone Portrait (390x844)', screen: 'host_lobby', vp: { width: 390, height: 844 }, filename: 'host_lobby_phone_portrait.png' },

    { name: 'iPad Landscape (1024x768)', screen: 'host_voting', vp: { width: 1024, height: 768 }, filename: 'host_voting_ipad_landscape.png' },
    { name: 'iPad Portrait (768x1024)', screen: 'host_voting', vp: { width: 768, height: 1024 }, filename: 'host_voting_ipad_portrait.png' },
    { name: 'Phone Portrait (390x844)', screen: 'host_voting', vp: { width: 390, height: 844 }, filename: 'host_voting_phone_portrait.png' },

    { name: 'iPad Landscape (1024x768)', screen: 'host_podium', vp: { width: 1024, height: 768 }, filename: 'host_podium_ipad_landscape.png' },
    { name: 'iPad Portrait (768x1024)', screen: 'host_podium', vp: { width: 768, height: 1024 }, filename: 'host_podium_ipad_portrait.png' },
    { name: 'Phone Portrait (390x844)', screen: 'host_podium', vp: { width: 390, height: 844 }, filename: 'host_podium_phone_portrait.png' }
];

test.describe('Capture Host Screen Visuals with Top Utility Controls', () => {
    for (const cap of CAPTURES) {
        test(`Capture ${cap.filename}`, async ({ page }) => {
            await page.setViewportSize(cap.vp);
            const url = `/?debug=${cap.screen}&players=6&viewport=full&hideToolbar=1`;
            await page.goto(url);
            await page.waitForTimeout(400);

            const outPath = path.join(ARTIFACT_DIR, cap.filename);
            await page.screenshot({ path: outPath, fullPage: false });
        });
    }
});
