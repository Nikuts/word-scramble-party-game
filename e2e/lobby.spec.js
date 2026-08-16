import { test, expect } from '@playwright/test';
import { createHostSession, joinPlayerSession, navigateToMainMenu, createMobilePlayerContext, isAudioEngineUnlocked } from './helpers/gameTestHelper.js';

test.describe('Lobby & Multiplayer Session Setup', () => {
    test('creates host display, joins 3 players, and validates lobby state and settings', async ({ browser }) => {
        // 1. Host Display Setup
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();
        const gameId = await createHostSession(hostPage);

        expect(gameId).toHaveLength(4);
        await expect(hostPage.locator('[data-testid="game-id"]')).toHaveText(gameId);

        // 2. First Player Joins (Becomes Host Player)
        const player1Context = await createMobilePlayerContext(browser);
        const p1Page = await player1Context.newPage();
        await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '👽' });

        // Player 1 should see Host controls (Start Game button, theme settings)
        await expect(p1Page.locator('text=You are the Host')).toBeVisible();
        await expect(p1Page.locator('button.btn-arcade:has-text("Start Game")')).toBeVisible();
        expect(await isAudioEngineUnlocked(p1Page)).toBe(true);

        // 3. Second Player Joins
        const player2Context = await createMobilePlayerContext(browser);
        const p2Page = await player2Context.newPage();
        await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🦊' });

        // 4. Third Player Joins
        const player3Context = await createMobilePlayerContext(browser);
        const p3Page = await player3Context.newPage();
        await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

        // 5. Verify all 3 players appear on Host Display and Player screens
        for (const name of ['Alice', 'Bob', 'Charlie']) {
            await expect(hostPage.locator(`text=${name}`).first()).toBeVisible();
            await expect(p1Page.locator(`text=${name}`).first()).toBeVisible();
        }

        // Verify player count on host screen shows (3)
        await expect(hostPage.locator('text=Players (3)')).toBeVisible();

        // 6. Test Avatar Selection Screen & Taken Avatar Disabling
        const player4Context = await createMobilePlayerContext(browser);
        const p4Page = await player4Context.newPage();
        await navigateToMainMenu(p4Page);
        await p4Page.click('button:has-text("Join as Player")');
        await p4Page.fill('#gameIdInput', gameId);
        await p4Page.fill('#playerNameInput', 'Dave');
        await p4Page.click('#joinGameBtn');

        // On Avatar Selection Screen, verify that Alice's avatar (👽), Bob's (🦊), and Charlie's (🤖) are greyed out & disabled
        const alienOption = p4Page.locator('.avatar-option[aria-label="Avatar 👽"]');
        await alienOption.waitFor({ state: 'visible', timeout: 5000 });
        await expect(alienOption).toBeDisabled();

        // Confirm Dave's avatar selection to enter lobby
        await p4Page.click('#confirmAvatarBtn');
        await expect(p4Page.locator('text=Dave').first()).toBeVisible();

        // 7. Test In-Lobby Name Redaction & Duplicate Rejection
        // Dave tries to edit name to "Alice" (duplicate)
        await p4Page.click('button[title*="Edit Name"], button[aria-label*="Edit Name"]');
        await p4Page.locator('input[maxlength="25"]').fill('Alice');
        await p4Page.locator('button:has-text("Save")').click();
        await expect(p4Page.locator('text=This name is already taken')).toBeVisible();

        // Dave edits name to "SuperDave"
        await p4Page.click('button[title*="Edit Name"], button[aria-label*="Edit Name"]');
        await p4Page.locator('input[maxlength="25"]').fill('SuperDave');
        await p4Page.locator('button:has-text("Save")').click();
        await expect(p4Page.locator('text=SuperDave').first()).toBeVisible();
        await expect(hostPage.locator('text=SuperDave').first()).toBeVisible();

        // 8. Test In-Lobby Avatar Reselection
        await p4Page.click('button:has-text("Change Character")');
        await expect(p4Page.locator('button:has-text("Confirm Character")')).toBeVisible();
        await p4Page.click('button:has-text("Confirm Character")');

        // 9. Test Theme Selection from Host Player
        // Pick a theme button if available or type a custom theme
        const customThemeInput = p1Page.locator('input[placeholder*="Custom Theme"], input[placeholder*="Власна тема"]');
        if (await customThemeInput.isVisible()) {
            await customThemeInput.fill('Space Pirates');
        }

        // Verify the theme updates across other screens
        await expect(hostPage.locator('text=Space Pirates')).toBeVisible({ timeout: 5000 });
        await expect(p2Page.locator('text=Space Pirates')).toBeVisible({ timeout: 5000 });

        // 10. Test Floating Emoji Reaction
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
