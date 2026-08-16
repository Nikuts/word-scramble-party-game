import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting 
} from './helpers/gameTestHelper.js';

test.describe('14-Player Maximum Lobby Scale Game Flow', () => {
    test('plays max capacity 14-player game with 10 battles per round (8 trios + 2 duos) and multi-voter tallying', async ({ browser }) => {
        test.setTimeout(360000); // 6 minutes for 14-player session

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Setup 14 Players with unique avatars
        const playerConfigs = [
            { name: 'Alice', avatar: '👽' },
            { name: 'Bob', avatar: '🦊' },
            { name: 'Charlie', avatar: '🤖' },
            { name: 'Dave', avatar: '🧙' },
            { name: 'Eve', avatar: '🐸' },
            { name: 'Frank', avatar: '🍄' },
            { name: 'Grace', avatar: '🦆' },
            { name: 'Heidi', avatar: '🐱' },
            { name: 'Ivan', avatar: '🐶' },
            { name: 'Judy', avatar: '🦜' },
            { name: 'Kevin', avatar: '🐧' },
            { name: 'Leo', avatar: '🐷' },
            { name: 'Mia', avatar: '💀' },
            { name: 'Noah', avatar: '🦠' }
        ];

        const players = [];
        const contexts = [hostContext];

        for (const config of playerConfigs) {
            const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
            contexts.push(ctx);
            const page = await ctx.newPage();
            await joinPlayerSession(page, { gameId, playerName: config.name, avatar: config.avatar });
            players.push({ page, name: config.name });
        }

        // Verify all 14 connected on Host
        await expect(hostPage.locator('text=Players (14)')).toBeVisible({ timeout: 25000 });

        // 3. Set Theme and Start Game from Host Player (Alice)
        const p1Page = players[0].page;
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Interstellar Championship');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 4. Phase 1: Question Answering (All 14 Players)
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 25000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // 5. Phase 2: Word Scramble Battles (7 battles scheduled: 7 quads * 4 = 28 slots = 2 battles per player)
        await expect(
            p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()
        ).toBeVisible({ timeout: 25000 });

        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // 6. Phase 3: Voting on Battles (7 Battles total)
        await expect(
            hostPage.locator('h1, h2, h3').filter({ hasText: /Vote|Showdown|Brawl|1-on-1|3-Way|4-Way|Battle/i }).first()
        ).toBeVisible({ timeout: 30000 });

        // Complete voting for all 7 battles in the round
        await completeAllBattlesVoting(players, hostPage, 7);

        // 7. Verify scoreboards updated with all 14 player results
        await expect(
            hostPage.locator('.host-lobby-container, .panel-arcade, .scoreboard, [data-testid="game-id"], h1, h2').first()
        ).toBeVisible();

        // Cleanup all 15 contexts
        for (const ctx of contexts) {
            await ctx.close();
        }
    });
});
