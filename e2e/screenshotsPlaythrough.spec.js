// e2e/screenshotsPlaythrough.spec.js
import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting,
    createMobilePlayerContext 
} from './helpers/gameTestHelper.js';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/nikku/.gemini/antigravity-ide/brain/009dc139-9a03-4c7b-9063-ffcb2566e6d1/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test('captures full 3-player game playthrough screenshots', async ({ browser }) => {
    test.setTimeout(180000);

    // 1. Host Context (1920x1080)
    const hostContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const hostPage = await hostContext.newPage();
    const gameId = await createHostSession(hostPage);
    console.log(`🎮 Game Room Code: ${gameId}`);

    await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_host_lobby_empty.png') });

    // 2. Setup 3 Mobile Players
    const p1Context = await createMobilePlayerContext(browser);
    const p1Page = await p1Context.newPage();
    await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '🦊' });

    const p2Context = await createMobilePlayerContext(browser);
    const p2Page = await p2Context.newPage();
    await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🐸' });

    const p3Context = await createMobilePlayerContext(browser);
    const p3Page = await p3Context.newPage();
    await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

    const players = [
        { page: p1Page, name: 'Alice' },
        { page: p2Page, name: 'Bob' },
        { page: p3Page, name: 'Charlie' }
    ];

    await hostPage.waitForTimeout(1000);
    await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_host_lobby_3_players.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_player_lobby.png') });

    // 3. Select Theme & Start Game from Host Player (Alice)
    console.log('🎨 Selecting Theme...');
    const themeBtn = p1Page.locator('button.theme-card, button:has-text("Bad Excuses"), button:has-text("Everyday Objects")').first();
    if (await themeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await themeBtn.click();
        await p1Page.waitForTimeout(500);
    } else {
        const customInput = p1Page.locator('input[placeholder*="Custom Theme"], input[type="text"]').first();
        if (await customInput.isVisible()) {
            await customInput.fill('Cyberpunk Quest');
            await p1Page.waitForTimeout(500);
        }
    }

    console.log('🏁 Starting Game...');
    const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game"), button:has-text("Start Game")');
    await expect(startBtn).toBeEnabled({ timeout: 15000 });
    await startBtn.click();

    // 4. Question Phase
    console.log('❓ Entering Question Phase...');
    await p1Page.locator('textarea').first().waitFor({ state: 'visible', timeout: 25000 });
    await hostPage.waitForTimeout(1000);

    await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_host_question_phase.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_player_question_phase.png') });

    for (const p of players) {
        await submitAllRoundQuestions(p.page, p.name);
    }

    // 5. Battle Answering Phase
    console.log('⚔️ Entering Battle Answering Phase...');
    await p1Page.locator('.overflow-y-auto button, button.btn-arcade').first().waitFor({ state: 'visible', timeout: 35000 });
    await hostPage.waitForTimeout(1500);

    await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_host_battle_answering.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_player_battle_answering.png') });

    for (const p of players) {
        await submitAllPlayerBattles(p.page, false);
    }

    // 6. Voting Phase
    console.log('🗳️ Entering Voting Phase...');
    // Allow get-ready countdown (~5s) to transition into active battle voting
    await hostPage.waitForTimeout(6000);

    await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_host_voting_phase.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_player_voting_phase.png') });

    // Complete all battle votings for Round 1
    await completeAllBattlesVoting(players, hostPage, 3);

    await hostPage.waitForTimeout(2000);
    await hostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_host_round_recap.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_player_round_recap.png') });

    console.log('✅ 3-Player Game Playthrough Screenshots Captured Successfully!');

    // Cleanup
    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
    await p3Context.close();
});
