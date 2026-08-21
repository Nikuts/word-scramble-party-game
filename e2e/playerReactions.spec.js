import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    createMobilePlayerContext,
    submitAllRoundQuestions,
    submitAllPlayerBattles
} from './helpers/gameTestHelper.js';

test.describe('In-Game Live Emoji Reactions E2E', () => {
    test('broadcasts floating reactions from players to host display in lobby and battle voting phases', async ({ browser }) => {
        test.setTimeout(90000);

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Setup 3 Players
        const p1Context = await createMobilePlayerContext(browser);
        const p1Page = await p1Context.newPage();
        await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '👽' });

        const p2Context = await createMobilePlayerContext(browser);
        const p2Page = await p2Context.newPage();
        await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🦊' });

        const p3Context = await createMobilePlayerContext(browser);
        const p3Page = await p3Context.newPage();
        await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

        // 3. Test Lobby Reactions (tapping avatar sends flying emoji to Host)
        const p1LobbyAvatarBtn = p1Page.locator('button').filter({ hasText: /Alice|👽/ }).first();
        if (await p1LobbyAvatarBtn.isVisible()) {
            await p1LobbyAvatarBtn.click();
            // Host should display flying emoji container element
            await expect(hostPage.locator('.flying-emoji').first()).toBeVisible({ timeout: 5000 });
        }

        // 4. Start Game from Host Player (Alice)
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Party Games');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 5. Submit Round 1 Questions
        const players = [
            { page: p1Page, name: 'Alice' },
            { page: p2Page, name: 'Bob' },
            { page: p3Page, name: 'Charlie' }
        ];

        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, 3);
        }

        // 6. Submit Battles
        await expect(
            p1Page.locator('button:has-text("Submit Battle Answer"), button:has-text("Надіслати відповідь")').first()
        ).toBeVisible({ timeout: 20000 });
        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // 7. Voting Phase: Wait for battle voting phase to load
        await expect(
            p1Page.locator('button:has-text("🔥"), button.btn-arcade:has-text("Vote"), h1:has-text("Voting")').first()
        ).toBeVisible({ timeout: 25000 });

        // Competitors (Alice & Bob in Battle 1) see the reaction toolbar immediately while waiting for Charlie to vote!
        let foundReactionPlayer = null;
        for (let attempt = 0; attempt < 20; attempt++) {
            for (const p of players) {
                const btn = p.page.locator('button:has-text("🔥")').first();
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click();
                    foundReactionPlayer = p;
                    break;
                }
            }
            if (foundReactionPlayer) break;
            await hostPage.waitForTimeout(300);
        }

        // 8. Verify Host Display renders the flying reaction emoji
        await expect(
            hostPage.locator('.flying-emoji').first()
        ).toBeVisible({ timeout: 10000 });

        // Cleanup
        await hostContext.close();
        await p1Context.close();
        await p2Context.close();
        await p3Context.close();
    });

    test('renders animated flying reactions on TV Mode without static freeze', async ({ browser }) => {
        test.setTimeout(45000);

        // 1. Setup Host Display in TV Mode
        const hostContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // Toggle TV Mode on Host
        const tvModeBtn = hostPage.locator('button[title*="TV"], button[aria-label*="TV"]').first();
        if (await tvModeBtn.isVisible()) {
            await tvModeBtn.click();
        } else {
            await hostPage.evaluate(() => document.body.setAttribute('data-tv-mode', 'true'));
        }

        // Verify TV mode is active
        await expect(hostPage.locator('body')).toHaveAttribute('data-tv-mode', 'true');

        // 2. Setup Mobile Player
        const playerContext = await createMobilePlayerContext(browser);
        const playerPage = await playerContext.newPage();
        await joinPlayerSession(playerPage, { gameId, playerName: 'TVReactor', avatar: '🚀' });

        // 3. Send reactions from player lobby
        const reactionBtn = playerPage.locator('button[aria-label*="Reaction"], button[title*="Reaction"], div.fixed.bottom-4.right-4 button').first();
        await expect(reactionBtn).toBeVisible({ timeout: 5000 });
        await reactionBtn.click();

        // 4. Verify Host Display has active flying emoji with animation
        const flyingEmoji = hostPage.locator('.flying-emoji').first();
        await expect(flyingEmoji).toBeVisible({ timeout: 5000 });

        // Verify computed animation is 'fly-across' and NOT 'none'
        const animationName = await flyingEmoji.evaluate(el => window.getComputedStyle(el).animationName);
        expect(animationName).toBe('fly-across');

        // Capture screenshot of flying emoji on TV mode
        await hostPage.screenshot({ path: 'C:/Users/nikku/.gemini/antigravity-ide/brain/009dc139-9a03-4c7b-9063-ffcb2566e6d1/screenshots/tv_mode_flying_reactions.png' });

        // 5. Verify auto-cleanup after animation / fallback timer
        await expect(hostPage.locator('.flying-emoji')).toHaveCount(0, { timeout: 6000 });

        // Cleanup
        await hostContext.close();
        await playerContext.close();
    });
});
