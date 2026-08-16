import { test, expect } from '@playwright/test';
import { createHostSession, joinPlayerSession, navigateToMainMenu } from './helpers/gameTestHelper.js';

test.describe('Lobby & Multiplayer Session Setup', () => {
    test('creates host display, joins 3 players, and validates lobby state and settings', async ({ browser }) => {
        // 1. Host Display Setup
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        expect(gameId).toHaveLength(4);
        await expect(hostPage.locator('[data-testid="game-id"]')).toHaveText(gameId);

        // 2. First Player Joins (Becomes Host Player)
        const player1Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p1Page = await player1Context.newPage();
        await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '👽' });

        // Player 1 should see Host controls (Start Game button, theme settings)
        await expect(p1Page.locator('text=You are the Host')).toBeVisible();
        await expect(p1Page.locator('button.btn-arcade:has-text("Start Game")')).toBeVisible();

        // 3. Second Player Joins
        const player2Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p2Page = await player2Context.newPage();
        await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🦊' });

        // 4. Third Player Joins
        const player3Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p3Page = await player3Context.newPage();
        await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

        // 5. Verify all 3 players appear on Host Display and Player screens
        for (const name of ['Alice', 'Bob', 'Charlie']) {
            await expect(hostPage.locator(`text=${name}`)).toBeVisible();
            await expect(p1Page.locator(`text=${name}`)).toBeVisible();
        }

        // Verify player count on host screen shows (3)
        await expect(hostPage.locator('text=Players (3)')).toBeVisible();

        // 6. Test Avatar Collision Rejection: Attempting to join with an already-used avatar
        const player4Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const p4Page = await player4Context.newPage();
        await navigateToMainMenu(p4Page);
        await p4Page.click('button:has-text("Join as Player")');
        await p4Page.fill('#gameIdInput', gameId);
        await p4Page.fill('#playerNameInput', 'Dave');

        // Select Alice's taken avatar (👽)
        const alienOption = p4Page.locator('.avatar-option[aria-label="Avatar 👽"]');
        await alienOption.click();
        await p4Page.click('button.btn-arcade:has-text("Join")');

        // Verify that server returns error and taken avatars become disabled
        await expect(p4Page.locator('text=This avatar is already taken')).toBeVisible();
        await expect(alienOption).toBeDisabled();

        // 7. Test Theme Selection from Host Player
        // Pick a theme button if available or type a custom theme
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Space Pirates');
        }

        // Verify the theme updates across other screens
        await expect(hostPage.locator('text=Space Pirates')).toBeVisible({ timeout: 5000 });
        await expect(p2Page.locator('text=Space Pirates')).toBeVisible({ timeout: 5000 });

        // 8. Test Floating Emoji Reaction
        const emojiBtn = p2Page.locator('button[title*="reaction"], button[title*="Реакція"], button[aria-label*="reaction"]').first();
        if (await emojiBtn.isVisible()) {
            await emojiBtn.click();
        }

        // Cleanup contexts
        await hostContext.close();
        await player1Context.close();
        await player2Context.close();
        await player3Context.close();
        await player4Context.close();
    });
});
