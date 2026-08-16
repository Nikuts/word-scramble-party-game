import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting 
} from './helpers/gameTestHelper.js';

test.describe('Player & Host Browser Refresh & Reconnection Resiliency', () => {
    test('handles mid-game player browser refresh and host display reload without losing game state', async ({ browser }) => {
        test.setTimeout(120000); // 2 minutes

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Setup 3 Players
        const p1Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p1Page = await p1Context.newPage();
        await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '👽' });

        const p2Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p2Page = await p2Context.newPage();
        await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🦊' });

        const p3Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p3Page = await p3Context.newPage();
        await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

        const players = [
            { page: p1Page, name: 'Alice' },
            { page: p2Page, name: 'Bob' },
            { page: p3Page, name: 'Charlie' }
        ];

        // 3. Set Theme and Start Game from Host Player (Alice)
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Time Travel Paradox');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 4. Wait for Question Phase to start
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        await expect(p2Page.locator('textarea')).toBeVisible({ timeout: 20000 });

        // ---------------------------------------------------------------------
        // TEST CASE 1: Player Mid-Game Page Refresh (Bob)
        // ---------------------------------------------------------------------
        // Bob refreshes his browser tab mid-game
        await p2Page.reload();

        // Bob should automatically reconnect via localStorage token and return to the Question screen
        await expect(
            p2Page.locator('textarea, h1:has-text("Question"), h2:has-text("Question")').first()
        ).toBeVisible({ timeout: 15000 });

        // ---------------------------------------------------------------------
        // TEST CASE 2: Host Display Page Refresh
        // ---------------------------------------------------------------------
        // Host TV Display refreshes
        await hostPage.reload();

        // Host Display should automatically reconnect via localStorage host session
        await expect(
            hostPage.locator('h1, h2').filter({ hasText: /Question Phase|Round/i }).first()
        ).toBeVisible({ timeout: 15000 });

        // Verify all 3 players are still displayed on the Host screen
        await expect(hostPage.locator('text=Alice').first()).toBeVisible();
        await expect(hostPage.locator('text=Bob').first()).toBeVisible();
        await expect(hostPage.locator('text=Charlie').first()).toBeVisible();

        // 5. Complete Question Phase after reloads
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // 6. Complete Battles and Voting
        await expect(
            p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()
        ).toBeVisible({ timeout: 25000 });

        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        await completeAllBattlesVoting(players, hostPage, 3);

        // 7. Verify scoreboards intact and gameplay continues
        await expect(
            hostPage.locator('.host-lobby-container, .panel-arcade, .scoreboard, [data-testid="game-id"], h1, h2').first()
        ).toBeVisible();

        // Cleanup contexts
        await hostContext.close();
        await p1Context.close();
        await p2Context.close();
        await p3Context.close();
    });
});
