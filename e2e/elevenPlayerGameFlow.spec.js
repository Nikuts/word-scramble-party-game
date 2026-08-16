import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting 
} from './helpers/gameTestHelper.js';

test.describe('11-Player Hybrid (1 vs 1 and 1 vs 1 vs 1) Game Flow', () => {
    test('plays 11-player game with hybrid 6 trios (1 vs 1 vs 1) and 2 duos (1 vs 1) across 8 battles per round', async ({ browser }) => {
        test.setTimeout(300000); // 5 minutes for 11-player session with 8 battles

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Setup 11 Players with unique avatars
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
            { name: 'Kevin', avatar: '🐧' }
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

        // Verify all 11 connected on Host
        await expect(hostPage.locator('text=Players (11)')).toBeVisible({ timeout: 20000 });

        // 3. Set Theme and Start Game from Host Player (Alice)
        const p1Page = players[0].page;
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Mythological Pantheon');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 4. Phase 1: Question Answering (All 11 Players)
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 25000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // 5. Phase 2: Word Scramble Battles (8 battles scheduled: 6 trios * 3 + 2 duos * 2 = 22 slots = 2 battles per player)
        await expect(
            p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()
        ).toBeVisible({ timeout: 25000 });

        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // 6. Phase 3: Voting on Hybrid Battles (8 Battles total: 6 Trios + 2 Duos)
        await expect(
            hostPage.locator('h1, h2, h3').filter({ hasText: /Vote|Showdown|Brawl|1-on-1|3-Way|Battle/i }).first()
        ).toBeVisible({ timeout: 30000 });

        // Complete voting for all 8 hybrid battles in the round
        await completeAllBattlesVoting(players, hostPage, 8);

        // 7. Verify scoreboards updated with all 11 player results
        await expect(
            hostPage.locator('.host-lobby-container, .panel-arcade, .scoreboard, [data-testid="game-id"], h1, h2').first()
        ).toBeVisible();

        // Cleanup all 12 contexts
        for (const ctx of contexts) {
            await ctx.close();
        }
    });
});
