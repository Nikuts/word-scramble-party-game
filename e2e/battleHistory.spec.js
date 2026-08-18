import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting,
    createMobilePlayerContext
} from './helpers/gameTestHelper.js';

test.describe('Battle History & Multi-Competitor Recap View', () => {
    test('verifies battle history navigation, multi-competitor layout, and image export triggers', async ({ browser }) => {
        test.setTimeout(240000); // 4 minutes for complete 3-round flow

        // 1. Setup Host & 3 Players
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        const p1Context = await createMobilePlayerContext(browser);
        const p1Page = await p1Context.newPage();
        await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '👽' });

        const p2Context = await createMobilePlayerContext(browser);
        const p2Page = await p2Context.newPage();
        await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🦊' });

        const p3Context = await createMobilePlayerContext(browser);
        const p3Page = await p3Context.newPage();
        await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

        const players = [
            { page: p1Page, name: 'Alice' },
            { page: p2Page, name: 'Bob' },
            { page: p3Page, name: 'Charlie' }
        ];

        // 2. Set Theme and Start Game from Host Player (Alice)
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Cyberpunk Quest');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 3. Round 1 Questions
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, 3);
        }

        // 4. Round 1 Battles
        await expect(
            p1Page.locator('button:has-text("Submit Battle Answer"), button:has-text("Надіслати відповідь")').first()
        ).toBeVisible({ timeout: 20000 });
        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // 5. Round 1 Voting
        await completeAllBattlesVoting(players, hostPage, 3);

        // Fast-forward or complete through round 2 & 3 or trigger results
        // For remaining rounds (Round 2 and Round 3):
        for (let round = 2; round <= 3; round++) {
            const isFinalRound = round === 3;
            // Questions
            await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 25000 });
            for (const p of players) {
                await submitAllRoundQuestions(p.page, 3);
            }

            // Battles
            await expect(
                p1Page.locator('[aria-label*="Movie Title"], button:has-text("Submit Battle Answer"), button:has-text("Submit Final Answer"), button:has-text("Надіслати")').first()
            ).toBeVisible({ timeout: 25000 });

            for (const p of players) {
                await submitAllPlayerBattles(p.page, isFinalRound);
            }

            // Voting
            await completeAllBattlesVoting(players, hostPage, 3);
        }

        // 6. At Game Over, check Results & Battle History button on Player screen
        const historyBtn = p1Page.locator('button:has-text("View Battle History"), button:has-text("Історія Битв")');
        await expect(historyBtn).toBeVisible({ timeout: 25000 });
        await historyBtn.click();

        // 7. Verify Battle History View opens
        await expect(p1Page.locator('h1:has-text("Battle History"), h1:has-text("Історія Битв")')).toBeVisible();

        // Verify "Back to Scores" button is visible
        const backBtn = p1Page.locator('button:has-text("Back to Scores"), button:has-text("Назад до результатів")');
        await expect(backBtn).toBeVisible();

        // Verify battle recap cards exist
        const battleCards = p1Page.locator('.battle-card-history');
        await expect(battleCards.first()).toBeVisible();

        // Verify Save buttons are present on cards
        const saveVerticalBtn = p1Page.locator('button:has-text("Save Vertical"), button:has-text("Зберегти вертикально")').first();
        await expect(saveVerticalBtn).toBeVisible();

        // Click Back to Scores and ensure navigation back to final scores
        await backBtn.click();
        await expect(historyBtn).toBeVisible();

        // Cleanup
        await hostContext.close();
        await p1Context.close();
        await p2Context.close();
        await p3Context.close();
    });
});
