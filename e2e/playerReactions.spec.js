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
});
