// e2e/hostViewportBounds.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ARTIFACT_DIR = process.env.PLAYWRIGHT_SCREENSHOT_DIR || path.join(os.tmpdir(), 'word-scramble-screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const VIEWPORTS = [
    { name: 'Laptop Standard (1366x768)', width: 1366, height: 768, isLandscape: true },
    { name: 'Laptop Windows 125% Scaled (1228x691)', width: 1228, height: 691, isLandscape: true },
    { name: 'iPad Landscape (1024x768)', width: 1024, height: 768, isLandscape: true },
    { name: 'Full HD TV/Monitor (1920x1080)', width: 1920, height: 1080, isLandscape: true },
    { name: '2K QHD Wide Monitor (2560x1440)', width: 2560, height: 1440, isLandscape: true },
    { name: 'Ultrawide 21:9 Monitor (2560x1080)', width: 2560, height: 1080, isLandscape: true },
    { name: 'WQHD Ultrawide Monitor (3440x1440)', width: 3440, height: 1440, isLandscape: true },
    { name: '4K UHD TV/Monitor (3840x2160)', width: 3840, height: 2160, isLandscape: true },
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

                            // Also verify internal scroll containers do not overflow on standard & scaled laptops/TVs
                            const internalOverflows = await page.evaluate(() => {
                                const els = Array.from(document.querySelectorAll('main, .overflow-y-auto'));
                                return els.map(el => ({
                                    tag: el.tagName,
                                    className: el.className,
                                    overflowY: el.scrollHeight - el.clientHeight,
                                    overflowX: el.scrollWidth - el.clientWidth
                                })).filter(x => x.overflowY > 4 || x.overflowX > 2);
                            });
                            expect(internalOverflows, `Internal container overflow on ${screen.name} (${vp.name}, ${count}P)`).toEqual([]);
                        }

                        // 3. Top Utility Controls (TV MODE, Close Lobby, END GAME)
                        const tvModeBtn = page.locator('button:has-text("TV MODE"), button:has-text("TV ON"), button:has-text("TV OFF"), button:has-text("ТБ УВІМК"), button:has-text("ТБ ВИМК")');
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

                            // Assert read-only theme showcase cards never collide with mode indicator cards
                            const lastThemeCard = page.locator('main section').nth(1).locator('[aria-live="polite"] > div').last();
                            const modeGrid = page.locator('main section').nth(1).locator('.grid-cols-3');
                            if (await lastThemeCard.isVisible() && await modeGrid.isVisible()) {
                                const cardBox = await lastThemeCard.boundingBox();
                                const modesBox = await modeGrid.boundingBox();
                                if (cardBox && modesBox) {
                                    expect(cardBox.y + cardBox.height, `Theme card overlapped mode indicator cards on ${vp.name}`).toBeLessThanOrEqual(modesBox.y + 2);
                                }
                            }

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
                            const optionCards = page.locator('[data-testid="voting-option-card"]');
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

    test('MainMenu scales up cleanly for 2K & Ultrawide monitors without overflow and HexBadge renders full SVG hex polygon', async ({ page }) => {
        // 1. Compare MainMenu button width between Laptop (1366x768) and 2K QHD (2560x1440) + Ultrawide (3440x1440)
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.goto('/');
        await page.waitForSelector('button:has-text("ENGLISH")');
        await page.click('button:has-text("ENGLISH")');
        await page.waitForSelector('button:has-text("CREATE & HOST")');
        // Verify centered 1-tap EN | УКР instant language switcher below menu
        await page.click('button[aria-label="Українська"]');
        await expect(page.locator('button:has-text("СТВОРИТИ ТА ХОСТИТИ")')).toBeVisible();
        await page.click('button[aria-label="English"]');
        await expect(page.locator('button:has-text("CREATE & HOST")')).toBeVisible();
        const laptopBox = await page.locator('button:has-text("CREATE & HOST")').boundingBox();

        for (const wideVp of [
            { width: 2560, height: 1440, name: '2K QHD' },
            { width: 2560, height: 1080, name: 'Ultrawide 21:9' },
            { width: 3440, height: 1440, name: 'WQHD Ultrawide' },
            { width: 3840, height: 2160, name: '4K UHD' },
        ]) {
            await page.setViewportSize({ width: wideVp.width, height: wideVp.height });
            await page.waitForTimeout(150);
            const overflow = await page.evaluate(() => ({
                x: document.documentElement.scrollWidth - window.innerWidth,
                y: document.documentElement.scrollHeight - window.innerHeight,
            }));
            expect(overflow.x, `MainMenu horizontal overflow on ${wideVp.name}`).toBeLessThanOrEqual(2);
            expect(overflow.y, `MainMenu vertical overflow on ${wideVp.name}`).toBeLessThanOrEqual(2);

            const wideBox = await page.locator('button:has-text("CREATE & HOST")').boundingBox();
            expect(wideBox.width, `MainMenu button should scale wider on ${wideVp.name} than 1366x768`).toBeGreaterThan(laptopBox.width);
        }

        // 2. Verify HexBadge renders a full 6-sided SVG polygon border and HostLobby fills >=90% of 4K 16:9 width
        await page.setViewportSize({ width: 3840, height: 2160 });
        await page.goto('/?debug=host_lobby&players=6&viewport=full&hideToolbar=1');
        await page.waitForSelector('header svg polygon');
        const polyPoints = await page.locator('header svg polygon').first().getAttribute('points');
        expect(polyPoints).toBeTruthy();
        expect(polyPoints.split(/\s+/).length).toBe(6);

        const mainBox4k = await page.locator('main').first().boundingBox();
        expect(mainBox4k.width, 'HostLobby on 4K 16:9 should fill >= 90% of 3840px width like TV/laptop').toBeGreaterThanOrEqual(3840 * 0.9);
        // HostLobby main body is strictly read-only (no theme buttons or custom text inputs on TV)
        await expect(page.locator('main button, main input')).toHaveCount(0);

        // 3. Verify HostLobby theme loading skeleton keeps all 4 cards equal height (no giant custom-theme box)
        await page.setViewportSize({ width: 2560, height: 1440 });
        await page.goto('/?debug=host_lobby&players=6&viewport=full&hideToolbar=1&generatingThemes=1');
        await page.waitForSelector('[aria-live="polite"]');
        const themeCards = page.locator('[aria-live="polite"] > div');
        await expect(themeCards).toHaveCount(4);
        const firstBox = await themeCards.nth(0).boundingBox();
        const customBox = await themeCards.nth(3).boundingBox();
        expect(Math.abs(firstBox.height - customBox.height), 'Loading skeleton cards should match custom-theme row height').toBeLessThanOrEqual(8);
    });

    test('Synthwave grid stays unburied above html base and freezes cleanly in TV Mode', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/?debug=host_lobby&players=6&viewport=full&hideToolbar=1');
        await page.waitForSelector('.synthwave-grid-background');

        const normalStyles = await page.evaluate(() => {
            const bodyBg = getComputedStyle(document.body).backgroundColor;
            const grid = document.querySelector('.synthwave-grid-background');
            const gridStyle = grid ? getComputedStyle(grid) : null;
            const beforeStyle = grid ? getComputedStyle(grid, '::before') : null;
            return {
                bodyBg,
                gridDisplay: gridStyle?.display,
                gridZIndex: Number(gridStyle?.zIndex || 0),
                beforeAnimationName: beforeStyle?.animationName
            };
        });

        expect(normalStyles.bodyBg, 'body must stay transparent so synthwave grid is not buried').toBe('rgba(0, 0, 0, 0)');
        expect(normalStyles.gridDisplay).not.toBe('none');
        expect(normalStyles.gridZIndex).toBeGreaterThanOrEqual(0);
        expect(normalStyles.beforeAnimationName).toBe('scroll-grid');

        // Toggle TV Mode ON via top header control and verify grid freezes instead of disappearing
        const tvToggle = page.locator('button:has-text("TV OFF"), button:has-text("TV MODE"), button:has-text("ТБ ВИМК")').first();
        await tvToggle.click();
        await page.waitForTimeout(150);

        const tvStyles = await page.evaluate(() => {
            const grid = document.querySelector('.synthwave-grid-background');
            return {
                tvAttr: document.body.getAttribute('data-tv-mode'),
                gridDisplay: grid ? getComputedStyle(grid).display : null,
                beforeAnimationName: grid ? getComputedStyle(grid, '::before').animationName : null
            };
        });

        expect(tvStyles.tvAttr).toBe('true');
        expect(tvStyles.gridDisplay).not.toBe('none');
        expect(tvStyles.beforeAnimationName).toBe('none');
    });

    test('1-on-1 Showdowns render centered VS HexBadge without card overlap and hide it on 3-Way Brawls', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });

        for (const screen of ['host_voting', 'host_reveal']) {
            await page.goto(`/?debug=${screen}&players=6&competitors=2&viewport=full&hideToolbar=1`);
            await page.waitForTimeout(screen === 'host_reveal' ? 900 : 350);

            const vsBadge = page.locator('main span:text-is("VS")').first();
            await expect(vsBadge, `VS crest should be visible on 1-on-1 ${screen}`).toBeVisible();
            const vsBox = await vsBadge.boundingBox();
            expect(vsBox).toBeTruthy();

            const cardSelector = screen === 'host_voting' ? '[data-testid="voting-option-card"]' : 'main .host-panel-surface';
            const cards = page.locator(cardSelector);
            expect(await cards.count()).toBe(2);

            const leftCard = await cards.nth(0).boundingBox();
            const rightCard = await cards.nth(1).boundingBox();
            expect(vsBox.x + vsBox.width / 2).toBeGreaterThan(leftCard.x + leftCard.width - 12);
            expect(vsBox.x + vsBox.width / 2).toBeLessThan(rightCard.x + 12);
        }

        // 3-Way Brawl must NOT display the 1-on-1 VS crest
        await page.goto('/?debug=host_voting&players=6&viewport=full&hideToolbar=1');
        await page.waitForTimeout(300);
        await expect(page.locator('main span:text-is("VS")')).toHaveCount(0);
    });

    test('Retrowave Canvas Battle Recap exports valid non-empty landscape and vertical PNGs under custom colorTheme', async ({ page }) => {
        const fs = await import('fs');
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto('/?debug=player_history&players=6&lang=en&colorTheme=outrun&viewport=mobile&hideToolbar=1');
        await page.waitForSelector('.save-btn-container button');

        const buttons = page.locator('.save-btn-container button');
        for (const idx of [0, 1]) {
            const downloadPromise = page.waitForEvent('download');
            await buttons.nth(idx).click();
            const download = await downloadPromise;
            const filePath = await download.path();
            expect(filePath).toBeTruthy();
            const buf = fs.readFileSync(filePath);
            expect(buf.length, `Exported PNG (btn ${idx}) should be > 20KB`).toBeGreaterThan(20_000);
            // Verify PNG magic signature: 89 50 4E 47
            expect(buf[0]).toBe(0x89);
            expect(buf[1]).toBe(0x50);
            expect(buf[2]).toBe(0x4E);
            expect(buf[3]).toBe(0x47);
        }
    });

    test('14-Player Host Arena fits 1228x691 (125% Laptop DPI) cleanly in EN and UA without card overflow', async ({ page }) => {
        for (const lang of ['en', 'ua']) {
            await page.setViewportSize({ width: 1228, height: 691 });
            await page.goto(`/?debug=host_question&players=14&lang=${lang}&viewport=full&hideToolbar=1`);
            await page.waitForSelector('.panel-arcade');
            await page.waitForTimeout(300);

            const metrics = await page.evaluate(() => {
                const doc = document.documentElement;
                const cards = Array.from(document.querySelectorAll('.panel-arcade'));
                const clippedCards = cards
                    .map((card, i) => ({
                        index: i,
                        overflowX: card.scrollWidth - card.clientWidth,
                        overflowY: card.scrollHeight - card.clientHeight,
                        bottomOver: Math.round(card.getBoundingClientRect().bottom - window.innerHeight),
                    }))
                    .filter((c) => c.overflowX > 2 || c.overflowY > 2 || c.bottomOver > 2);
                return {
                    cardCount: cards.length,
                    overflowX: doc.scrollWidth - window.innerWidth,
                    overflowY: doc.scrollHeight - window.innerHeight,
                    clippedCards,
                };
            });

            expect(metrics.cardCount).toBe(14);
            expect(metrics.overflowX, `14P HostArena overflowX (${lang})`).toBeLessThanOrEqual(2);
            expect(metrics.overflowY, `14P HostArena overflowY (${lang})`).toBeLessThanOrEqual(2);
            expect(metrics.clippedCards, `14P HostArena card clipping (${lang})`).toEqual([]);

            await page.screenshot({
                path: path.join(ARTIFACT_DIR, `qa_host_arena_14p_${lang}_691.png`),
                fullPage: false,
            });
        }
    });

    test('Chamfered Arcade Confirm Modal replaces native confirm() on HostLobby and HostGameView', async ({ page }) => {
        let nativeDialogFired = false;
        page.on('dialog', async (d) => {
            nativeDialogFired = true;
            await d.dismiss();
        });

        await page.setViewportSize({ width: 1228, height: 691 });

        // 1. Test Close Lobby modal in EN & UA + Escape & Cancel dismissal
        for (const lang of ['en', 'ua']) {
            await page.goto(`/?debug=host_lobby&players=6&lang=${lang}&viewport=full&hideToolbar=1`);
            const closeBtn = page.locator('header button[aria-label*="Close Lobby"], header button[aria-label*="Закрити лобі"], header button:has-text("CLOSE"), header button:has-text("ЗАКРИТИ")').first();
            await closeBtn.click();

            const modal = page.locator('[data-testid="arcade-confirm-modal"]');
            await expect(modal).toBeVisible();
            await expect(modal).toHaveAttribute('open', '');

            const cancelBtn = modal.locator('[data-testid="arcade-confirm-cancel"]');
            await expect(cancelBtn).toBeFocused();

            await page.screenshot({
                path: path.join(ARTIFACT_DIR, `qa_arcade_modal_lobby_${lang}.png`),
                fullPage: false,
            });

            await cancelBtn.click();
            await expect(modal).not.toBeVisible();
        }

        // 2. Test End Game modal in live Host session (confirm closes room cleanly)
        await page.goto('/');
        await page.click('button:has-text("ENGLISH")');
        await page.click('button:has-text("Create & Host Display")');
        await page.waitForSelector('[data-testid="game-id"]');

        const liveCloseBtn = page.locator('header button[title*="Close Lobby"], header button:has-text("CLOSE")').first();
        await liveCloseBtn.click();

        const liveModal = page.locator('[data-testid="arcade-confirm-modal"]');
        await expect(liveModal).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(liveModal).not.toBeVisible();

        await liveCloseBtn.click();
        await expect(liveModal).toBeVisible();
        await liveModal.locator('[data-testid="arcade-confirm-accept"]').click();
        await expect(page.locator('button:has-text("Create & Host Display")')).toBeVisible({ timeout: 10000 });
        expect(nativeDialogFired).toBe(false);
    });
});
