// e2e/mobileViewportBounds.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ARTIFACT_DIR = process.env.PLAYWRIGHT_SCREENSHOT_DIR || path.join(os.tmpdir(), 'word-scramble-screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

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

                    // 4. Guard PlayerResultsView action buttons stay above reaction footer without overlapping
                    if (screen.id === 'player_results') {
                        const historyBtn = page.locator('button:has-text("VIEW BATTLE HISTORY"), button:has-text("ІСТОРІЯ БИТВ")').first();
                        const playAgainBtn = page.locator('button:has-text("PLAY AGAIN"), button:has-text("ГРАТИ ЗНОВУ")').first();
                        const footer = page.locator('footer').first();

                        await expect(historyBtn).toBeVisible();
                        await expect(footer).toBeVisible();

                        const historyBox = await historyBtn.boundingBox();
                        const footerBox = await footer.boundingBox();
                        expect(historyBox.y + historyBox.height, `Battle History button overlapped footer on ${vp.name}`).toBeLessThanOrEqual(footerBox.y + 2);
                        expect(footerBox.y + footerBox.height, `Reaction footer clipped below viewport on ${vp.name}`).toBeLessThanOrEqual(vp.height + 2);

                        if (await playAgainBtn.isVisible()) {
                            const playAgainBox = await playAgainBtn.boundingBox();
                            expect(playAgainBox.y + playAgainBox.height, `Play Again button overlapped footer on ${vp.name}`).toBeLessThanOrEqual(footerBox.y + 2);
                        }
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

    test('Mobile text inputs enforce >= 16px font size to prevent iOS Safari focus zoom', async ({ page }) => {
        for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
            await page.setViewportSize(vp);

            await page.goto('/?debug=player_avatar&viewport=mobile&hideToolbar=1');
            const nameInput = page.locator('#profile-name-input');
            await expect(nameInput).toBeVisible();
            const nameFontPx = await nameInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
            expect(nameFontPx, `Profile name input must be >= 16px on ${vp.width}px`).toBeGreaterThanOrEqual(16);

            await page.goto('/?debug=player_lobby&pIndex=0&viewport=mobile&hideToolbar=1');
            const themeInput = page.locator('input[maxlength="100"]');
            await expect(themeInput).toBeVisible();
            const themeFontPx = await themeInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
            expect(themeFontPx, `Custom theme input must be >= 16px on ${vp.width}px`).toBeGreaterThanOrEqual(16);

            if (vp.width === 390) {
                await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_mobile_lobby_16px_390.png'), fullPage: false });
            }
        }
    });

    test('Battle History save error renders top-layer Arcade Toast instead of native alert()', async ({ page }) => {
        let nativeAlertFired = false;
        page.on('dialog', async (d) => {
            nativeAlertFired = true;
            await d.dismiss();
        });

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?debug=player_history&players=6&lang=en&viewport=mobile&hideToolbar=1');
        await page.waitForSelector('.save-btn-container button');

        // Force canvas PNG encoding failure so saveAsImage exercises showToast()
        await page.evaluate(() => {
            HTMLCanvasElement.prototype.toBlob = function (cb) {
                cb(null);
            };
        });

        await page.locator('.save-btn-container button').first().click();

        const toast = page.locator('[data-testid="arcade-toast"]');
        await expect(toast).toBeVisible({ timeout: 5000 });
        const toastBox = await toast.boundingBox();
        expect(toastBox.x).toBeGreaterThanOrEqual(0);
        expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(392);
        expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(844);

        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_mobile_toast_390.png'), fullPage: false });

        await toast.locator('[data-testid="arcade-toast-dismiss"]').click();
        await expect(toast).not.toBeVisible();
        expect(nativeAlertFired).toBe(false);
    });
});
