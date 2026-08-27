// e2e/hostViewportBounds.spec.js
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
    { name: 'Laptop Standard (1366x768)', width: 1366, height: 768, isLandscape: true },
    { name: 'Laptop Windows 125% Scaled (1228x691)', width: 1228, height: 691, isLandscape: true },
    { name: 'iPad Landscape (1024x768)', width: 1024, height: 768, isLandscape: true },
    { name: 'Full HD TV/Monitor (1920x1080)', width: 1920, height: 1080, isLandscape: true },
    { name: 'iPad Portrait (768x1024)', width: 768, height: 1024, isLandscape: false },
    { name: 'iPad Air Portrait (820x1180)', width: 820, height: 1180, isLandscape: false },
    { name: 'Phone Portrait (390x844)', width: 390, height: 844, isLandscape: false }
];

const SCREENS = [
    { id: 'host_lobby', name: 'Host Lobby' },
    { id: 'host_question', name: 'Host Question Arena' },
    { id: 'host_voting', name: 'Host Voting Arena (3-Way Brawl)' },
    { id: 'host_reveal', name: 'Host Reveal & Royalties' },
    { id: 'host_podium', name: 'Host Winner Podium & Accolades' }
];

const PLAYER_COUNTS = [3, 6, 8, 14];

test.describe('Host Screen Viewport Bounds & Tablet/Mobile Usability Audit', () => {

    for (const vp of VIEWPORTS) {
        test.describe(`Viewport: ${vp.name}`, () => {

            for (const screen of SCREENS) {
                for (const count of PLAYER_COUNTS) {
                    test(`Verify ${screen.name} with ${count} players operates cleanly on ${vp.name}`, async ({ page }) => {
                        await page.setViewportSize({ width: vp.width, height: vp.height });
                        
                        const url = `/?debug=${screen.id}&players=${count}&viewport=full&hideToolbar=1`;
                        await page.goto(url);
                        await page.waitForTimeout(300);

                        // 1. Assert Document has Zero Horizontal Overflow (no side scrolling)
                        const overflow = await page.evaluate(() => {
                            const doc = document.documentElement;
                            return {
                                scrollHeight: doc.scrollHeight,
                                innerHeight: window.innerHeight,
                                scrollWidth: doc.scrollWidth,
                                innerWidth: window.innerWidth,
                                overflowY: doc.scrollHeight - window.innerHeight,
                                overflowX: doc.scrollWidth - window.innerWidth
                            };
                        });

                        expect(overflow.overflowX, `Page horizontally overflowed by ${overflow.overflowX}px on ${screen.name} (${vp.name}, ${count}P)`).toBeLessThanOrEqual(2);

                        // 2. On Landscape TV/Laptops (width >= 1024), assert 100% viewport containment (zero vertical overflow)
                        if (vp.isLandscape && vp.width >= 1024) {
                            expect(overflow.overflowY, `Page vertically overflowed by ${overflow.overflowY}px on ${screen.name} (${vp.name}, ${count}P)`).toBeLessThanOrEqual(2);
                        }

                        // 3. Top Utility Controls (TV MODE, Close Lobby, END GAME)
                        const tvModeBtn = page.locator('button:has-text("TV MODE"), button:has-text("TV ON"), button:has-text("TV OFF")');
                        if (await tvModeBtn.count() > 0) {
                            await expect(tvModeBtn.first()).toBeVisible();
                            const box = await tvModeBtn.first().boundingBox();
                            expect(box?.y, 'TV mode button should be located in the top header area').toBeLessThan(200);
                        }

                        // 4. Screen-Specific Ergonomics Assertions
                        if (screen.id === 'host_lobby') {
                            const qrTile = page.locator('[data-testid="game-id"]').first();
                            await expect(qrTile).toBeVisible();

                            const fontSize = await qrTile.evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
                            expect(fontSize).toBeGreaterThanOrEqual(20);

                            // Orientation hint check on portrait devices
                            if (!vp.isLandscape) {
                                const hint = page.locator('text=Rotate device to landscape');
                                if (await hint.isVisible()) {
                                    const dismissBtn = page.locator('button[aria-label="Dismiss orientation hint"]');
                                    if (await dismissBtn.isVisible()) {
                                        await dismissBtn.click();
                                        await expect(hint).not.toBeVisible();
                                    }
                                }
                            }
                        }

                        if (screen.id === 'host_question') {
                            const names = page.locator('.panel-arcade p.font-black');
                            const nameCount = await names.count();
                            expect(nameCount).toBeGreaterThanOrEqual(Math.min(count, 3));
                        }

                        if (screen.id === 'host_voting') {
                            const optionCards = page.locator('main .bg-neutral-950\\/85');
                            const cardCount = await optionCards.count();
                            expect(cardCount).toBeGreaterThanOrEqual(2);
                        }

                        if (screen.id === 'host_podium') {
                            const firstPlace = page.locator('text=CHAMPION');
                            await expect(firstPlace).toBeVisible();
                        }
                    });
                }
            }
        });
    }

    test('Loading State does NOT prematurely display disconnected screen or retry buttons', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.goto('/?debug=host_question&viewport=full&hideToolbar=1');
        await page.waitForTimeout(500);

        const retryButton = page.locator('button:has-text("Tap to Reconnect")');
        await expect(retryButton).not.toBeVisible();
    });
});
