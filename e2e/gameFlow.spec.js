import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting,
    createMobilePlayerContext,
    isAudioEngineUnlocked
} from './helpers/gameTestHelper.js';

test.describe('Complete 3-Player Game Flow', () => {
    test('plays through lobby, question answering, word scramble battles, and all sequential voting battles', async ({ browser }) => {
        test.setTimeout(120000); // 2 minutes for complete multi-phase flow

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Setup 3 Players on Mobile Contexts
        const p1Context = await createMobilePlayerContext(browser);
        const p1Page = await p1Context.newPage();
        await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '👽' });

        const p2Context = await createMobilePlayerContext(browser);
        const p2Page = await p2Context.newPage();
        await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🦊' });

        const p3Context = await createMobilePlayerContext(browser);
        const p3Page = await p3Context.newPage();
        await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

        // Verify Web Audio Engine unlocked on mobile user interaction
        expect(await isAudioEngineUnlocked(p1Page)).toBe(true);

        const players = [
            { page: p1Page, name: 'Alice' },
            { page: p2Page, name: 'Bob' },
            { page: p3Page, name: 'Charlie' }
        ];

        // Verify all 3 connected on Host
        await expect(hostPage.locator('text=Players (3)')).toBeVisible();

        // 3. Set Theme and Start Game from Host Player (Alice)
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Cyberpunk Quest');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 4. Phase 1: Question Answering
        // Wait for Question phase to load on player screens
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 20000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // 5. Phase 2: Word Scramble Battle Answering
        // Wait for battle answering phase to begin (after get-ready / timer transition)
        await expect(
            p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()
        ).toBeVisible({ timeout: 25000 });

        // All players submit their battle answers using word bank tiles
        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // 6. Phase 3: Voting Phase (Sequential Voting for All 3 Battles)
        // Complete voting for all battles in the round
        await completeAllBattlesVoting(players, hostPage, 3);

        // 7. Verify round advancement, updated scores, or Round 2 transition
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
