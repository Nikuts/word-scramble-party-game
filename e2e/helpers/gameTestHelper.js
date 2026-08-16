/**
 * Helper utilities for managing multi-user sessions (Host + Players) in Playwright tests.
 */

/**
 * Navigates to the app root and ensures the user reaches the Main Menu,
 * clicking the Language selector button if prompted.
 * 
 * @param {import('@playwright/test').Page} page
 * @param {'en'|'uk'} lang
 */
export async function navigateToMainMenu(page, lang = 'en') {
    await page.goto('/');
    
    // Check if on initial Language Selection screen
    const langBtn = page.locator(`button.btn-arcade:has-text("${lang === 'uk' ? 'Українська' : 'English'}")`);
    try {
        if (await langBtn.isVisible({ timeout: 2000 })) {
            await langBtn.click();
        }
    } catch {
        // Language screen was not shown, already on main menu or stored in localStorage
    }

    // Wait for the Main Menu buttons to be visible
    await page.locator('button:has-text("Host Display"), button:has-text("Join as Player"), button:has-text("Створити екран")').first().waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Creates a Host Display session on the main menu, waits for the lobby to load,
 * and extracts the 4-letter Game ID.
 * 
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} The 4-letter Game ID
 */
export async function createHostSession(page) {
    await navigateToMainMenu(page, 'en');
    
    // Click "Create Host Display"
    const hostBtn = page.locator('button:has-text("Host Display"), button:has-text("Створити екран")');
    await hostBtn.waitFor({ state: 'visible' });
    await hostBtn.click();

    // Wait for the Game ID to appear in the Host Lobby
    const gameIdElement = page.locator('[data-testid="game-id"]');
    await gameIdElement.waitFor({ state: 'visible', timeout: 15000 });
    
    const gameId = (await gameIdElement.innerText()).trim();
    if (!gameId || gameId.length !== 4) {
        throw new Error(`Invalid Game ID retrieved from host: "${gameId}"`);
    }

    return gameId;
}

/**
 * Connects a player to an active game lobby.
 * 
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {string} options.gameId
 * @param {string} options.playerName
 * @param {string} [options.avatar]
 */
export async function joinPlayerSession(page, { gameId, playerName, avatar }) {
    await navigateToMainMenu(page, 'en');

    // Click "Join as Player"
    const joinBtn = page.locator('button:has-text("Join as Player"), button:has-text("Приєднатися як гравець")');
    await joinBtn.waitFor({ state: 'visible' });
    await joinBtn.click();

    // Fill in Game ID and Name
    await page.fill('#gameIdInput', gameId);
    await page.fill('#playerNameInput', playerName);

    // Select avatar if specified, or pick first available
    if (avatar) {
        const avatarOption = page.locator(`.avatar-option[aria-label="Avatar ${avatar}"]`);
        if (await avatarOption.isVisible()) {
            await avatarOption.click();
        }
    }

    // Submit Join Form
    const submitBtn = page.locator('button.btn-arcade:has-text("Join"), button.btn-arcade:has-text("Приєднатися")');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();

    // Wait for Player Lobby to load
    await page.locator('h1, h2').filter({ hasText: /Host|Lobby|Чекаємо|гравців|Players/i }).first().waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Fills in and submits answers during Phase 1 (Question Answering).
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string} answerText
 */
export async function submitQuestionAnswer(page, answerText = "This is a wonderful test answer for the question.") {
    const textarea = page.locator('textarea');
    await textarea.waitFor({ state: 'visible', timeout: 15000 });
    await textarea.fill(answerText);

    const submitBtn = page.locator('button.btn-arcade:has-text("Submit"), button.btn-arcade:has-text("Надіслати")');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();
}

/**
 * Selects words from the word bank and submits an answer during Phase 2 (Word Scramble Battle).
 * 
 * @param {import('@playwright/test').Page} page
 * @param {number} wordCount Number of words to click from word bank
 */
export async function submitScrambleBattleAnswer(page, wordCount = 4) {
    // Wait for the word bank or answer container to appear
    const wordBankButtons = page.locator('.p-3.bg-neutral-900 button, button:has-text("✕") ~ div button');
    await wordBankButtons.first().waitFor({ state: 'visible', timeout: 20000 });

    const totalAvailable = await wordBankButtons.count();
    const toClick = Math.min(wordCount, totalAvailable);

    for (let i = 0; i < toClick; i++) {
        const btn = wordBankButtons.nth(i);
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(100);
        }
    }

    // Submit the battle answer
    const submitBtn = page.locator('button.btn-arcade:has-text("Submit Battle Answer"), button.btn-arcade:has-text("Надіслати відповідь")');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();
}

/**
 * Casts a vote on the battle voting screen.
 * 
 * @param {import('@playwright/test').Page} page
 * @param {number} optionIndex 0 for Answer A, 1 for Answer B, etc.
 */
export async function castBattleVote(page, optionIndex = 0) {
    const voteButtons = page.locator('button.btn-arcade:has-text("Vote For This Answer"), button.btn-arcade:has-text("Голосувати за цю відповідь")');
    await voteButtons.first().waitFor({ state: 'visible', timeout: 20000 });

    const targetBtn = voteButtons.nth(optionIndex);
    if (await targetBtn.isVisible()) {
        await targetBtn.click();
    }
}
