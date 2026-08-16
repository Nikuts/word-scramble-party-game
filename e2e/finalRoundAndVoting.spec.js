import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions,
    submitAllPlayerBattles,
    completeAllBattlesVoting
} from './helpers/gameTestHelper.js';

test.describe('Full Multi-Round Lifecycle, Voting & Final Round Showdown', () => {
    test('plays complete 3-round game through all voting battles, Round 3 movie dialogue finale, and winner podium', async ({ browser }) => {
        test.setTimeout(240000); // 4 minutes to comfortably cover all 3 rounds, reveals, and winner podium

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Connect 3 Players (Alice = Host Player, Bob, Charlie)
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
            await customThemeInput.fill('Sci-Fi Odyssey');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // ---------------------------------------------------------------------
        // ROUND 1: Questions -> Battles (2 per player) -> Sequential Voting
        // ---------------------------------------------------------------------
        // Phase 1: Question Answering
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // Phase 2: Word Scramble Battles
        await expect(p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()).toBeVisible({ timeout: 25000 });
        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // Phase 3: Sequential Voting & Reveals for Round 1
        await completeAllBattlesVoting(players, hostPage, 3);

        // ---------------------------------------------------------------------
        // ROUND 2: Questions -> Battles -> Voting
        // ---------------------------------------------------------------------
        await expect(
            p1Page.locator('textarea, h1:has-text("Round 2"), h2:has-text("Round 2")').first()
        ).toBeVisible({ timeout: 40000 });

        // Submit Round 2 Questions
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // Round 2 Battle Answering
        await expect(p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()).toBeVisible({ timeout: 25000 });
        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // Round 2 Voting
        await completeAllBattlesVoting(players, hostPage, 3);

        // ---------------------------------------------------------------------
        // ROUND 3 (FINALE): Questions -> Movie Dialogue Showdown -> Winner Podium
        // ---------------------------------------------------------------------
        await expect(
            p1Page.locator('textarea, h1:has-text("Round 3"), h2:has-text("Round 3"), h1:has-text("Final")').first()
        ).toBeVisible({ timeout: 40000 });

        // Submit Round 3 Questions
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // Round 3 Final Battle: Movie Title & Tagline builder
        await expect(
            p1Page.locator('[aria-label*="Movie Title"], [aria-label*="Movie Tagline"], button:has-text("Submit Battle Answer")').first()
        ).toBeVisible({ timeout: 25000 });

        for (const p of players) {
            await submitAllPlayerBattles(p.page, true);
        }

        // Round 3 Final Battle Voting: Dialogue cards with Title & Tagline
        await completeAllBattlesVoting(players, hostPage, 3);

        // ---------------------------------------------------------------------
        // FINAL RESULTS & WINNER PODIUM
        // ---------------------------------------------------------------------
        // Host should display final winner results podium / game over screen
        await expect(
            hostPage.locator('h1, h2, h3').filter({ hasText: /Winner|Game Over|Podium|Scores|Congratulations|Переможець/i }).first()
        ).toBeVisible({ timeout: 30000 });

        // Verify "Play Again" or "Battle History" controls exist on Host / Player screens
        await expect(
            hostPage.locator('button:has-text("Play Again"), button:has-text("Грати знову"), button:has-text("Battle History"), button:has-text("Історія")').first()
        ).toBeVisible({ timeout: 15000 });

        // Cleanup contexts
        await hostContext.close();
        await p1Context.close();
        await p2Context.close();
        await p3Context.close();
    });
});
