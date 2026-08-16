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

    // Wait for Join Prompt to be fully visible
    await page.locator('#gameIdInput').waitFor({ state: 'visible', timeout: 10000 });
    await page.fill('#gameIdInput', gameId);
    await page.fill('#playerNameInput', playerName);

    // Submit Join Form
    await page.locator('#joinGameBtn').click();

    // On Avatar Selection Screen, optionally select avatar and click Confirm Character
    const confirmAvatarBtn = page.locator('#confirmAvatarBtn, [data-testid="confirm-avatar-btn"]');
    await confirmAvatarBtn.waitFor({ state: 'visible', timeout: 10000 });
    if (avatar) {
        const avatarOption = page.locator(`.avatar-option[aria-label="Avatar ${avatar}"]`);
        if (await avatarOption.isVisible().catch(() => false)) {
            await avatarOption.click();
        }
    }
    await confirmAvatarBtn.click();

    // Wait for Player Lobby to load
    await page.locator('h1, h2, span').filter({ hasText: /Host|Lobby|Чекаємо|гравців|Players/i }).first().waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Answers all available questions for a player in a round dynamically until all questions are answered.
 * 
 * @param {import('@playwright/test').Page} page
 * @param {string} playerName
 */
export async function submitAllRoundQuestions(page, playerName) {
    const textarea = page.locator('textarea');
    await textarea.waitFor({ state: 'visible', timeout: 25000 });

    let qCount = 0;
    while (await textarea.isVisible()) {
        qCount++;
        await textarea.fill(`Creative test answer number ${qCount} from ${playerName} for this awesome question.`);
        
        const submitBtn = page.locator('button.btn-arcade:has-text("Submit"), button.btn-arcade:has-text("Надіслати")');
        await submitBtn.waitFor({ state: 'visible' });
        await submitBtn.click();
        await page.waitForTimeout(400);

        // Check if all questions are answered
        const isWaiting = await page.locator('text=Waiting for other players, text=Чекаємо на інших').first().isVisible().catch(() => false);
        if (isWaiting) break;
    }
}

/**
 * Selects words from the word bank and submits an answer during regular battle rounds (Rounds 1 & 2).
 * 
 * @param {import('@playwright/test').Page} page
 * @param {number} wordCount Number of words to click from word bank
 */
export async function submitScrambleBattleAnswer(page, wordCount = 4) {
    const wordBankButtons = page.locator('.p-3.bg-neutral-900 button, button:has-text("✕") ~ div button');
    await wordBankButtons.first().waitFor({ state: 'visible', timeout: 20000 });

    const totalAvailable = await wordBankButtons.count();
    const toClick = Math.min(wordCount, totalAvailable);

    for (let i = 0; i < toClick; i++) {
        const btn = wordBankButtons.nth(i);
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(80);
        }
    }

    const submitBtn = page.locator('button.btn-arcade:has-text("Submit Battle Answer"), button.btn-arcade:has-text("Надіслати відповідь")');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();
}

/**
 * Selects words and fills both Movie Title and Tagline during Round 3 (Finale).
 * 
 * @param {import('@playwright/test').Page} page
 */
export async function submitFinalBattleAnswer(page) {
    const wordBankButtons = page.locator('.p-3.bg-neutral-900 button');
    await wordBankButtons.first().waitFor({ state: 'visible', timeout: 20000 });

    // 1. Add words to Title (default active line)
    const totalAvailable = await wordBankButtons.count();
    const titleWords = Math.min(2, totalAvailable);
    for (let i = 0; i < titleWords; i++) {
        const btn = wordBankButtons.nth(i);
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(80);
        }
    }

    // 2. Switch to Tagline
    const taglineBox = page.locator('[aria-label="Select Movie Tagline for adding words"]');
    if (await taglineBox.isVisible()) {
        await taglineBox.click();
        await page.waitForTimeout(100);
    }

    // 3. Add words to Tagline
    const remainingCount = await wordBankButtons.count();
    const taglineWords = Math.min(3, remainingCount);
    for (let i = 0; i < taglineWords; i++) {
        const btn = wordBankButtons.nth(i);
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(80);
        }
    }

    // 4. Submit Final Battle Answer
    const submitBtn = page.locator('button.btn-arcade:has-text("Submit Battle Answer"), button.btn-arcade:has-text("Надіслати відповідь")');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();
}

/**
 * Submits all battles for a given player in a round.
 * 
 * @param {import('@playwright/test').Page} page
 * @param {boolean} isFinalRound
 */
export async function submitAllPlayerBattles(page, isFinalRound = false) {
    for (let b = 0; b < 2; b++) {
        const submitBtn = page.locator('button.btn-arcade:has-text("Submit Battle Answer")');
        try {
            if (await submitBtn.isVisible({ timeout: 5000 })) {
                if (isFinalRound) {
                    await submitFinalBattleAnswer(page);
                } else {
                    await submitScrambleBattleAnswer(page, 4);
                }
                await page.waitForTimeout(400);
            }
        } catch {
            // Already completed or transitioned
        }
    }
}

/**
 * Handles sequential voting for all battles in a round:
 * Locates ALL non-competing voters for each active battle, casts their votes,
 * and waits for the 7-second reveal before handling the next battle.
 * 
 * @param {Array<{page: import('@playwright/test').Page, name: string}>} players
 * @param {import('@playwright/test').Page} hostPage
 * @param {number} battleCount
 */
export async function completeAllBattlesVoting(players, hostPage, battleCount = 3) {
    for (let i = 0; i < battleCount; i++) {
        let anyVoted = false;
        const startTime = Date.now();
        
        while (!anyVoted && Date.now() - startTime < 30000) {
            for (const p of players) {
                const voteBtns = p.page.locator('button.btn-arcade:has-text("Vote For This Answer")');
                if (await voteBtns.first().isVisible().catch(() => false)) {
                    await voteBtns.first().click();
                    anyVoted = true;
                    await p.page.waitForTimeout(150);
                }
            }
            if (!anyVoted) {
                await hostPage.waitForTimeout(300);
            }
        }
        
        // Wait for the reveal duration + next battle transition
        await hostPage.waitForTimeout(7500);
    }
}

/**
 * Creates an isolated mobile browser context with mobile viewport and touch capabilities.
 * @param {import('@playwright/test').Browser} browser
 * @param {Object} [overrides]
 * @returns {Promise<import('@playwright/test').BrowserContext>}
 */
export async function createMobilePlayerContext(browser, overrides = {}) {
    return browser.newContext({
        viewport: { width: 390, height: 844 }, // iPhone dimensions
        hasTouch: true,
        isMobile: true,
        ...overrides
    });
}

/**
 * Checks whether the Web Audio SoundEngine has been unlocked via user gesture on the page.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isAudioEngineUnlocked(page) {
    return page.evaluate(() => {
        return window.__soundEngine?.isUnlocked === true;
    }).catch(() => false);
}

/**
 * Retrieves the count of times a sound has been triggered through the SoundEngine.
 * @param {import('@playwright/test').Page} page
 * @param {string} soundId
 * @returns {Promise<number>}
 */
export async function getSoundPlayCount(page, soundId) {
    return page.evaluate((id) => {
        return window.__soundEngine?.getPlayCount(id) || 0;
    }, soundId).catch(() => 0);
}
