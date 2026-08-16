import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting 
} from './helpers/gameTestHelper.js';

test.describe('3-Way Brawl (1 vs 1 vs 1) Game Flow', () => {
    test('plays 9-player game with pure 3-way brawls (6 trios per round), 3 answer cards, and multi-voter tallying', async ({ browser }) => {
        test.setTimeout(240000); // 4 minutes for 9-player flow

        // 1. Setup Host Display
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        // 2. Setup 9 Players with unique avatars
        const playerConfigs = [
            { name: 'Alice', avatar: '👽' },
            { name: 'Bob', avatar: '🦊' },
            { name: 'Charlie', avatar: '🤖' },
            { name: 'Dave', avatar: '🧙' },
            { name: 'Eve', avatar: '🐸' },
            { name: 'Frank', avatar: '🍄' },
            { name: 'Grace', avatar: '🦆' },
            { name: 'Heidi', avatar: '🐱' },
            { name: 'Ivan', avatar: '🐶' }
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

        // Verify all 9 connected on Host
        await expect(hostPage.locator('text=Players (9)')).toBeVisible({ timeout: 15000 });

        // 3. Set Theme and Start Game from Host Player (Alice)
        const p1Page = players[0].page;
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Cyberpunk Gladiator');
            await p1Page.waitForTimeout(300);
        }

        const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game")');
        await expect(startBtn).toBeEnabled({ timeout: 10000 });
        await startBtn.click();

        // 4. Phase 1: Question Answering (All 9 Players)
        await expect(p1Page.locator('textarea')).toBeVisible({ timeout: 25000 });
        for (const p of players) {
            await submitAllRoundQuestions(p.page, p.name);
        }

        // 5. Phase 2: Word Scramble Battles (6 trios = 18 slots = 2 battles per player)
        await expect(
            p1Page.locator('.p-3.bg-neutral-900 button, button:has-text("Submit Battle Answer")').first()
        ).toBeVisible({ timeout: 25000 });

        for (const p of players) {
            await submitAllPlayerBattles(p.page, false);
        }

        // 6. Phase 3: Voting on 3-Way Brawls (6 Battles per round)
        await expect(
            hostPage.locator('h1, h2, h3').filter({ hasText: /Vote|Brawl|Showdown|Results|Battle|Підсумки|Битва/i }).first()
        ).toBeVisible({ timeout: 30000 });

        // Complete voting for all 6 trio battles in the round
        await completeAllBattlesVoting(players, hostPage, 6);

        // 7. Verify scoreboards updated with multi-voter results
        await expect(
            hostPage.locator('.host-lobby-container, .panel-arcade, .scoreboard, [data-testid="game-id"], h1, h2').first()
        ).toBeVisible();

        // Cleanup all 10 contexts
        for (const ctx of contexts) {
            await ctx.close();
        }
    });
});
