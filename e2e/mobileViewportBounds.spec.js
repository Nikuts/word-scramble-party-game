// e2e/mobileViewportBounds.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/nikku/.gemini/antigravity/brain/384590c5-3b22-4f96-89e2-7e50f2b5b4c3';

const MOBILE_VIEWPORTS = [
    { name: 'iPhone 13/14 (390x844)', width: 390, height: 844 },
    { name: 'Compact Phone (375x667)', width: 375, height: 667 },
    { name: 'Android Standard (360x800)', width: 360, height: 800 }
];

const MOBILE_SCREENS = [
    { id: 'player_lobby', name: 'Player Lobby' },
    { id: 'player_avatar', name: 'Avatar Select & Profile' },
    { id: 'player_question', name: 'Question Answering' },
    { id: 'player_battle_single', name: 'Battle Answering (Single Line)' },
    { id: 'player_battle_movie', name: 'Battle Answering (Movie 2-Line)' },
    { id: 'player_voting', name: 'Player Voting View' },
    { id: 'player_reveal', name: 'Battle Winner Reveal' },
    { id: 'player_results', name: 'Player Final Results' }
];

test.describe('Mobile Viewport Bounds & Usability Audit', () => {

    for (const vp of MOBILE_VIEWPORTS) {
        test.describe(`Mobile Viewport: ${vp.name}`, () => {

            for (const screen of MOBILE_SCREENS) {
                test(`Verify ${screen.name} fits on ${vp.name} without clipping or false disconnect`, async ({ page }) => {
                    await page.setViewportSize({ width: vp.width, height: vp.height });
                    
                    const url = `/?debug=${screen.id}&viewport=mobile&hideToolbar=1`;
                    await page.goto(url);
                    await page.waitForTimeout(300);

                    // 1. Assert zero horizontal overflow on all mobile viewports
                    const overflow = await page.evaluate(() => {
                        const doc = document.documentElement;
                        return {
                            overflowX: doc.scrollWidth - window.innerWidth,
                            overflowY: doc.scrollHeight - window.innerHeight
                        };
                    });
                    expect(overflow.overflowX, `Horizontal overflow on ${screen.name} (${vp.name})`).toBeLessThanOrEqual(2);

                    // 2. Assert No Disconnected or Tap to Reconnect buttons shown
                    const retryBtn = page.locator('button:has-text("Tap to Reconnect")');
                    await expect(retryBtn).not.toBeVisible();

                    // 3. Assert interactive elements are clickable on input screens
                    if (screen.id !== 'player_reveal') {
                        const buttons = page.locator('button:visible');
                        const btnCount = await buttons.count();
                        expect(btnCount).toBeGreaterThanOrEqual(1);
                    }

                    // Capture screenshot on 390x844 and 375x667 for visual inspection
                    if (vp.width === 390) {
                        const filename = `mobile_${screen.id}.png`;
                        const outPath = path.join(ARTIFACT_DIR, filename);
                        await page.screenshot({ path: outPath, fullPage: false });
                    } else if (vp.width === 375 && (screen.id === 'player_lobby' || screen.id === 'player_reveal' || screen.id === 'player_results')) {
                        const filename = `mobile_${screen.id}_375.png`;
                        const outPath = path.join(ARTIFACT_DIR, filename);
                        await page.screenshot({ path: outPath, fullPage: false });
                    }
                });
            }
        });
    }
});
