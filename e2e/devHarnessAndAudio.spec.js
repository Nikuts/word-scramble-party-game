// e2e/devHarnessAndAudio.spec.js
import { test, expect } from '@playwright/test';
import { navigateToMainMenu } from './helpers/gameTestHelper.js';

function attachErrorListeners(page) {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            // Offline sandboxes cannot resolve external Google Fonts CDNs
            if (!text.includes('net::ERR_NAME_NOT_RESOLVED')) {
                errors.push(text);
            }
        }
    });
    page.on('pageerror', err => {
        errors.push(err.message);
    });
    return errors;
}

test.describe('Dev Harness, Navigation & Background Music Controls', () => {
    test('Main Menu displays direct controls for UI Harness and Music Lab without errors', async ({ page }) => {
        const errors = attachErrorListeners(page);

        await navigateToMainMenu(page, 'en');

        const harnessLink = page.getByRole('link', { name: /UI Dev Harness/i });
        const musicBtn = page.getByRole('button', { name: /Music & Sound Lab/i });
        await expect(harnessLink).toBeVisible();
        await expect(musicBtn).toBeVisible();

        expect(errors).toEqual([]);
    });

    test('Navigates to Music & Sound Lab from Main Menu, auditions 15-track live soundtrack, and returns cleanly', async ({ page }) => {
        const errors = attachErrorListeners(page);

        await navigateToMainMenu(page, 'en');
        await page.getByRole('button', { name: /Music & Sound Lab/i }).click();

        await expect(page.locator('h1')).toContainText('Interactive Music Sampler');

        // Verify scroll shell can scroll vertically with zero horizontal overflow
        const scrollMetrics = await page.evaluate(() => {
            const shell = document.querySelector('.sound-test-scroll-shell');
            if (!shell) return null;
            shell.scrollTop = 250;
            const scrolledTo = shell.scrollTop;
            shell.scrollTop = 0;
            return {
                scrollHeight: shell.scrollHeight,
                clientHeight: shell.clientHeight,
                scrollWidth: shell.scrollWidth,
                clientWidth: shell.clientWidth,
                scrolledTo
            };
        });
        expect(scrollMetrics).not.toBeNull();
        expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
        expect(scrollMetrics.scrolledTo).toBeGreaterThan(0);
        expect(scrollMetrics.scrollWidth).toBeLessThanOrEqual(scrollMetrics.clientWidth + 2);

        // Verify Live Soundtrack (15) shows all 15 final tracks
        await expect(page.getByText('LIVE RETRO-ARCADE SOUNDTRACK')).toBeVisible();
        await expect(page.getByRole('button', { name: /Live Soundtrack \(15\)/i })).toBeVisible();
        await expect(page.locator('.studio-card')).toHaveCount(15);
        await expect(page.locator('.card-title').filter({ hasText: 'Newer Wave' })).toBeVisible();
        await expect(page.locator('.card-title').filter({ hasText: 'Rhinoceros' })).toBeVisible();
        await expect(page.locator('.card-title').filter({ hasText: 'Voxel Revolution' })).toBeVisible();

        // Click Listen on Digital Lemonade
        const playDigitalBtn = page.locator('.card-play-action').filter({ hasText: 'Digital Lemonade' });
        await expect(playDigitalBtn).toBeVisible();
        await playDigitalBtn.click();
        await expect(page.locator('.now-playing-pill')).toContainText('NOW PLAYING: DIGITAL LEMONADE');

        // Dislike Laser Groove, verify removal + Restore button, then restore it
        const laserGrooveCard = page.locator('.studio-card').filter({ hasText: 'Laser Groove' });
        await laserGrooveCard.locator('.card-dislike-btn').click();
        await expect(page.locator('.card-title').filter({ hasText: 'Laser Groove' })).not.toBeVisible();
        const restoreBtn = page.getByRole('button', { name: /Restore 1 Disliked/i });
        await expect(restoreBtn).toBeVisible();
        await restoreBtn.click();
        await expect(page.locator('.card-title').filter({ hasText: 'Laser Groove' })).toBeVisible();

        // Verify Procedural Synth comparison section is also present
        await expect(page.getByText('Deep Lo-Fi Sub-Bass')).toBeVisible();

        // Click Back to Main Menu
        await page.getByRole('button', { name: /Main Menu/i }).click();
        await expect(page.getByRole('button', { name: /Music & Sound Lab/i })).toBeVisible();

        expect(errors).toEqual([]);
    });

    test('Loads Music & Sound Lab via ?music=1 and filters multi-stage pools cleanly', async ({ page }) => {
        const errors = attachErrorListeners(page);

        await page.goto('/?music=1');
        await expect(page.locator('h1')).toContainText('Interactive Music Sampler');
        await expect(page.getByRole('button', { name: /All \(15\)/i })).toBeVisible();

        // Check multi-stage filtering for Lobby (3 primary + 3 secondary = 6 tracks) and Voting (3 tracks)
        await page.getByRole('button', { name: /Lobby \(6\)/i }).click();
        await expect(page.locator('.studio-card')).toHaveCount(6);
        await expect(page.locator('.card-title').filter({ hasText: 'Newer Wave' })).toBeVisible();

        await page.getByRole('button', { name: /Voting \(3\)/i }).click();
        await expect(page.locator('.studio-card')).toHaveCount(3);
        await expect(page.locator('.card-title').filter({ hasText: 'Laserpack' })).toBeVisible();
        await expect(page.locator('.card-title').filter({ hasText: 'Voxel Revolution' })).toBeVisible();
        await expect(page.locator('.card-title').filter({ hasText: 'Digital Lemonade' })).toBeVisible();

        expect(errors).toEqual([]);
    });

    test('Host HUD & Host Player screens display functional synced Music toggles without console errors', async ({ page }) => {
        const errors = attachErrorListeners(page);

        await page.goto('/?debug=host_lobby');
        const lobbyToggle = page.getByTestId('music-toggle-btn');
        await expect(lobbyToggle).toBeVisible();
        await expect(lobbyToggle).toHaveAttribute('aria-pressed', 'true');
        await lobbyToggle.click();
        await expect(lobbyToggle).toHaveAttribute('aria-pressed', 'false');
        await lobbyToggle.click();
        await expect(lobbyToggle).toHaveAttribute('aria-pressed', 'true');

        await page.goto('/?debug=host_question');
        const gameToggle = page.getByTestId('music-toggle-btn');
        await expect(gameToggle).toBeVisible();
        await expect(gameToggle).toHaveAttribute('aria-pressed', 'true');
        await gameToggle.click();
        await expect(gameToggle).toHaveAttribute('aria-pressed', 'false');
        await gameToggle.click();
        await expect(gameToggle).toHaveAttribute('aria-pressed', 'true');

        // Host Player Lobby (paired with TV Mode)
        await page.goto('/?debug=player_lobby&viewport=mobile&hideToolbar=1');
        const playerLobbyToggle = page.getByTestId('player-music-toggle-btn');
        await expect(playerLobbyToggle).toBeVisible();
        await expect(playerLobbyToggle).toHaveAttribute('aria-pressed', 'true');
        await playerLobbyToggle.click();
        await expect(playerLobbyToggle).toHaveAttribute('aria-pressed', 'false');
        await playerLobbyToggle.click();
        await expect(playerLobbyToggle).toHaveAttribute('aria-pressed', 'true');

        // Host Player mid-game header toggle (Host visible, non-host hidden)
        await page.goto('/?debug=player_question&viewport=mobile&hideToolbar=1');
        const hostPlayerToggle = page.getByTestId('player-music-toggle-btn');
        await expect(hostPlayerToggle).toBeVisible();
        await expect(hostPlayerToggle).toHaveAttribute('aria-pressed', 'true');
        await hostPlayerToggle.click();
        await expect(hostPlayerToggle).toHaveAttribute('aria-pressed', 'false');
        await hostPlayerToggle.click();
        await expect(hostPlayerToggle).toHaveAttribute('aria-pressed', 'true');

        await page.goto('/?debug=player_question&pIndex=1&viewport=mobile&hideToolbar=1');
        await expect(page.getByTestId('player-music-toggle-btn')).toHaveCount(0);

        expect(errors).toEqual([]);
    });

    test('Loads ?debug=1 UI Dev Harness in a true 390px mobile iframe with live toolbar sync and zero console errors', async ({ page }) => {
        const errors = attachErrorListeners(page);

        await page.goto('/?debug=1');
        const deviceIframe = page.getByTestId('dev-device-frame');
        await expect(deviceIframe).toBeVisible();

        const frame = page.frameLocator('[data-testid="dev-device-frame"]');
        await expect(frame.getByText('What is the #1 rule in a support group')).toBeVisible();
        await expect(frame.getByTestId('player-music-toggle-btn')).toBeVisible();

        const innerWidth = await deviceIframe.evaluate((el) => el.contentWindow?.innerWidth);
        expect(innerWidth).toBe(390);

        // Switching screen to instructions updates the iframe to render Instructions (not PlayerGameView)
        await page.locator('#dev-screen-select').selectOption('instructions');
        await expect(frame.getByRole('heading', { name: 'How to Play' })).toBeVisible();

        // Changing color theme updates body[data-theme] inside the iframe live
        await page.locator('#dev-theme-select').selectOption('outrun');
        await expect.poll(async () => {
            return await deviceIframe.evaluate((el) => el.contentDocument?.body?.dataset?.theme);
        }).toBe('outrun');

        expect(errors).toEqual([]);
    });
});
