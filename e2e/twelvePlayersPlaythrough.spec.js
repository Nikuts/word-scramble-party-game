// e2e/twelvePlayersPlaythrough.spec.js
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

test('12-Player Grand Party Playthrough & Multi-Screen Visual Audit', async ({ browser }) => {
    test.setTimeout(300000);

    console.log('📺 Creating Host TV (1920x1080)...');
    const tvHostContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const tvHostPage = await tvHostContext.newPage();
    const gameId = await createHostSession(tvHostPage);
    console.log(`🎮 Game Room Code Created: ${gameId}`);

    console.log('💻 Creating Host Laptop (1366x768)...');
    const laptopHostContext = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });
    const laptopHostPage = await laptopHostContext.newPage();
    await laptopHostPage.goto(`/?gameId=${gameId}`);
    await laptopHostPage.waitForTimeout(500);

    const playerConfigs = [
        { name: 'Alice', avatar: '🦊', vp: { width: 390, height: 844 } },
        { name: 'Bob', avatar: '🐸', vp: { width: 375, height: 667 } },
        { name: 'Charlie', avatar: '🤖', vp: { width: 412, height: 915 } },
        { name: 'Diana', avatar: '🐱', vp: { width: 390, height: 844 } },
        { name: 'Evan', avatar: '🐶', vp: { width: 384, height: 854 } },
        { name: 'Fiona', avatar: '🐻', vp: { width: 375, height: 667 } },
        { name: 'George', avatar: '🐼', vp: { width: 390, height: 844 } },
        { name: 'Hannah', avatar: '🐨', vp: { width: 412, height: 915 } },
        { name: 'Ivan', avatar: '🦁', vp: { width: 384, height: 854 } },
        { name: 'Julia', avatar: '🐯', vp: { width: 390, height: 844 } },
        { name: 'Kevin', avatar: '🐵', vp: { width: 375, height: 667 } },
        { name: 'Luna', avatar: '👻', vp: { width: 412, height: 915 } },
    ];

    const players = [];

    console.log('👥 Connecting 12 players with distinct mobile viewports & avatars...');
    for (const cfg of playerConfigs) {
        const ctx = await browser.newContext({ viewport: cfg.vp });
        const page = await ctx.newPage();
        await joinPlayerSession(page, { gameId, playerName: cfg.name, avatar: cfg.avatar });
        players.push({ page, name: cfg.name, avatar: cfg.avatar });
        console.log(`  ✓ ${cfg.name} (${cfg.avatar}) joined`);
    }

    // Capture 12-Player Lobby on TV, Laptop, and Mobile
    await tvHostPage.waitForTimeout(1000);
    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_tv_lobby.png') });
    await laptopHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_laptop_lobby.png') });
    await players[0].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p1_host_player_lobby.png') });
    await players[1].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p2_iphonese_lobby.png') });

    // Host Player (Alice) selects a theme
    console.log('🎨 Alice selects theme and starts 12-player game...');
    const themeBtn = players[0].page.locator('button.theme-card, button:has-text("Bad Excuses"), button:has-text("Everyday Objects"), button:has-text("Haunted")').first();
    if (await themeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await themeBtn.click();
        await players[0].page.waitForTimeout(400);
    } else {
        const customInput = players[0].page.locator('input[placeholder*="Custom Theme"], input[type="text"]').first();
        if (await customInput.isVisible()) {
            await customInput.fill('Epic Cyberpunk Gala');
            await players[0].page.waitForTimeout(400);
        }
    }

    const startBtn = players[0].page.locator('button.btn-arcade:has-text("Start Game"), button:has-text("Start Game")');
    await expect(startBtn).toBeEnabled({ timeout: 15000 });
    await startBtn.click();

    // ----------------------------------------------------
    // ROUND 1: Question Phase (12 Players)
    // ----------------------------------------------------
    console.log('❓ Round 1 Question Phase for 12 players...');
    await players[0].page.locator('textarea').first().waitFor({ state: 'visible', timeout: 25000 });
    await tvHostPage.waitForTimeout(1000);

    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_tv_round1_question.png') });
    await players[1].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p2_iphonese_question.png') });

    // All 12 players submit answers
    for (const p of players) {
        await submitAllRoundQuestions(p.page, p.name);
    }

    // Capture Waiting Screen with Reaction Button
    await players[0].page.waitForTimeout(600);
    await players[0].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p1_question_waiting_reaction.png') });

    // ----------------------------------------------------
    // ROUND 1: Battle Answering Phase (12 Players)
    // ----------------------------------------------------
    console.log('⚔️ Round 1 Battle Answering for 12 players...');
    await players[0].page.locator('button.btn-arcade').first().waitFor({ state: 'visible', timeout: 35000 });
    await tvHostPage.waitForTimeout(1000);

    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_tv_round1_battle_answering.png') });
    await players[0].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p1_battle_answering.png') });
    await players[1].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p2_iphonese_battle_answering.png') });

    for (const p of players) {
        await submitAllPlayerBattles(p.page, false);
    }

    // ----------------------------------------------------
    // ROUND 1: Voting Phase & Reveal (12 Players)
    // ----------------------------------------------------
    console.log('🗳️ Round 1 Sequential Voting Phase for 12 players...');
    await tvHostPage.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });
    await tvHostPage.waitForTimeout(1200);

    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_tv_round1_voting.png') });
    await laptopHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_laptop_round1_voting.png') });
    await players[0].page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_p1_voting_screen.png') });

    const totalBattles = Math.min(6, Math.floor(players.length / 2));
    await completeAllBattlesVoting(players, tvHostPage, totalBattles);

    // Capture Round 1 Recap on TV
    await tvHostPage.waitForTimeout(1500);
    await tvHostPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '12p_tv_round1_recap.png') });

    console.log('🎉 12-Player Full Playthrough Verification Complete!');
});
