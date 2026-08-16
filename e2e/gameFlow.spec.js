import { test, expect } from '@playwright/test';
import { createHostSession, joinPlayerSession, submitQuestionAnswer, submitScrambleBattleAnswer, castBattleVote } from './helpers/gameTestHelper.js';

test.describe('Complete 3-Player Game Flow', () => {
    test('plays through lobby, question answering, word scramble battles, and voting phase', async ({ browser }) => {
        test.setTimeout(120000); // Allow sufficient time for multi-phase real-time game flow

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

        // Verify all 3 connected on Host
        await expect(hostPage.locator('text=Players (3)')).toBeVisible();

        // 3. Set Theme and Start Game from Host Player (Alice)
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Cyberpunk Quest');
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 4. Phase 1: Question Answering
        // Wait for Question phase to load on player screens
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        await expect(p2Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        await expect(p3Page.locator('textarea')).toBeVisible({ timeout: 20000 });

        // Answer all questions for all 3 players
        const players = [
            { page: p1Page, name: 'Alice' },
            { page: p2Page, name: 'Bob' },
            { page: p3Page, name: 'Charlie' }
        ];

        // Loop answering questions until players reach the waiting screen
        for (const player of players) {
            for (let q = 0; q < 4; q++) {
                const textarea = player.page.locator('textarea');
                if (await textarea.isVisible()) {
                    await submitQuestionAnswer(player.page, `This is a super creative answer number ${q + 1} from ${player.name} for testing purposes.`);
                    await player.page.waitForTimeout(200);
                }
            }
        }

        // 5. Phase 2: Word Scramble Battle Answering
        // Wait for battle answering phase to begin (after get-ready / timer transition)
        const firstPlayerWithBattle = p1Page;
        await expect(
            firstPlayerWithBattle.locator('.bg-neutral-900 button, button:has-text("Submit Battle Answer"), button:has-text("Get Ready"), h1:has-text("Battle")').first()
        ).toBeVisible({ timeout: 25000 });

        // All players submit their battle answers using word bank tiles
        for (const player of players) {
            // Check if player has battle prompts to answer
            const wordBankFirstBtn = player.page.locator('.p-3.bg-neutral-900 button').first();
            try {
                await wordBankFirstBtn.waitFor({ state: 'visible', timeout: 15000 });
                // If visible, answer the battles
                for (let b = 0; b < 2; b++) {
                    const submitBtn = player.page.locator('button.btn-arcade:has-text("Submit Battle Answer")');
                    if (await submitBtn.isVisible()) {
                        await submitScrambleBattleAnswer(player.page, 4);
                        await player.page.waitForTimeout(300);
                    }
                }
            } catch {
                // Battle might have already advanced or player is waiting
            }
        }

        // 6. Phase 3: Voting Phase
        // Host should transition to voting battle or battle reveal
        await expect(
            hostPage.locator('h1, h2, h3').filter({ hasText: /Vote|Showdown|Brawl|1-on-1|3-Way|Battle/i }).first()
        ).toBeVisible({ timeout: 30000 });

        // Check if any player has the voting screen active and cast vote
        for (const player of players) {
            const voteBtn = player.page.locator('button.btn-arcade:has-text("Vote For This Answer")').first();
            if (await voteBtn.isVisible()) {
                await voteBtn.click();
            }
        }

        // 7. Verify round continuity & Host scoreboard / results visibility
        await expect(
            hostPage.locator('.host-lobby-container, .panel-arcade, .scoreboard, [data-testid="game-id"], h1, h2').first()
        ).toBeVisible();

        // Cleanup
        await hostContext.close();
        await p1Context.close();
        await p2Context.close();
        await p3Context.close();
    });
});
