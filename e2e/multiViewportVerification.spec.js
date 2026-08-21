// e2e/multiViewportVerification.spec.js
import { test, expect } from '@playwright/test';
import { 
    createHostSession, 
    joinPlayerSession, 
    submitAllRoundQuestions, 
    submitAllPlayerBattles, 
    completeAllBattlesVoting 
} from './helpers/gameTestHelper.js';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/nikku/.gemini/antigravity-ide/brain/009dc139-9a03-4c7b-9063-ffcb2566e6d1/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test('Multi-Viewport & Responsive Layout Autonomous Visual Audit', async ({ browser }) => {
    test.setTimeout(240000);

    // 1. Host TV (1920x1080)
    const tvHostContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const tvHostPage = await tvHostContext.newPage();
    const gameId = await createHostSession(tvHostPage);
    console.log(`🎮 Game Room Code: ${gameId}`);

    // 2. Host Laptop (1366x768)
    const laptopHostContext = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });
    const laptopHostPage = await laptopHostContext.newPage();
    await laptopHostPage.goto(`/?display=host&gameId=${gameId}`);
    await laptopHostPage.waitForTimeout(1000);

    // 3. Player 1: iPhone 14 (390x844)
    const p1Context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    });
    const p1Page = await p1Context.newPage();
    await joinPlayerSession(p1Page, { gameId, playerName: 'Alice', avatar: '🦊' });

    // 4. Player 2: iPhone SE (375x667)
    const p2Context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    });
    const p2Page = await p2Context.newPage();
    await joinPlayerSession(p2Page, { gameId, playerName: 'Bob', avatar: '🐸' });

    // 5. Player 3: Android Large (412x915)
    const p3Context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
    });
    const p3Page = await p3Context.newPage();
    await joinPlayerSession(p3Page, { gameId, playerName: 'Charlie', avatar: '🤖' });

    const players = [
        { page: p1Page, name: 'Alice', vp: 'iphone14' },
        { page: p2Page, name: 'Bob', vp: 'iphonese' },
        { page: p3Page, name: 'Charlie', vp: 'android' }
    ];

    // Capture Lobby Screenshots
    await tvHostPage.waitForTimeout(1000);
    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_tv_lobby.png') });
    await laptopHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_laptop_lobby.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p1_iphone14_lobby.png') });
    await p2Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p2_iphonese_lobby.png') });
    await p3Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p3_android_lobby.png') });

    // Send Emoji Reaction from Player 2 (Bob) and verify floating reaction on both phone and TV
    console.log('🎉 Sending live emoji reaction...');
    const emojiBtn = p2Page.locator('button[aria-label="Send Reaction"], button:has-text("🐸")').last();
    if (await emojiBtn.isVisible().catch(() => false)) {
        await emojiBtn.click();
        await p2Page.waitForTimeout(300);
        await p2Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p2_reaction_floating.png') });
    }

    // Select Theme & Start Game from Host Player (Alice)
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

    console.log('🚀 Starting Game...');
    const startBtn = p1Page.locator('button.btn-arcade:has-text("Start Game"), button:has-text("Start Game")');
    await expect(startBtn).toBeEnabled({ timeout: 15000 });
    await startBtn.click();

    // ----------------------------------------------------
    // ROUND 1: Question Phase
    // ----------------------------------------------------
    console.log('❓ Round 1 Question Phase...');
    await p1Page.locator('textarea').first().waitFor({ state: 'visible', timeout: 25000 });
    await tvHostPage.waitForTimeout(1000);

    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_tv_round1_question.png') });
    await laptopHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_laptop_round1_question.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p1_iphone14_question.png') });
    await p2Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p2_iphonese_question.png') });

    for (const p of players) {
        await submitAllRoundQuestions(p.page, p.name);
    }

    // ----------------------------------------------------
    // ROUND 1: Battle Answering Phase
    // ----------------------------------------------------
    console.log('⚔️ Round 1 Battle Answering Phase...');
    await p1Page.locator('button.btn-arcade').first().waitFor({ state: 'visible', timeout: 35000 });
    await tvHostPage.waitForTimeout(1500);

    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_tv_round1_battle_answering.png') });
    await laptopHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_laptop_round1_battle_answering.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p1_iphone14_battle_answering.png') });
    await p2Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p2_iphonese_battle_answering.png') });
    await p3Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p3_android_battle_answering.png') });

    for (const p of players) {
        await submitAllPlayerBattles(p.page, false);
    }

    // ----------------------------------------------------
    // ROUND 1: Voting Phase & Results Reveal
    // ----------------------------------------------------
    console.log('🗳️ Round 1 Voting Phase...');
    await tvHostPage.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
    await tvHostPage.waitForTimeout(1500);

    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_tv_round1_voting_centered.png') });
    await laptopHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_laptop_round1_voting_centered.png') });
    await p1Page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'vp_p1_voting_screen.png') });

    await completeAllBattlesVoting(players, tvHostPage, 3);

    console.log('✅ Multi-Viewport Visual Audit Complete!');
});
