// e2e/captureHostScreenshots.spec.js
import { test } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ARTIFACT_DIR = process.env.PLAYWRIGHT_SCREENSHOT_DIR || path.join(os.tmpdir(), 'word-scramble-screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const CAPTURES = [
    { screen: 'host_lobby', vp: { width: 1920, height: 1080 }, filename: 'host_lobby_tv.png', players: 6, lang: 'en' },
    { screen: 'host_question', vp: { width: 1920, height: 1080 }, filename: 'host_question_tv.png', players: 6, lang: 'en' },
    { screen: 'host_voting', vp: { width: 1920, height: 1080 }, filename: 'host_voting_tv.png', players: 6, lang: 'en' },
    { screen: 'host_reveal', vp: { width: 1920, height: 1080 }, filename: 'host_reveal_tv.png', players: 6, lang: 'en' },
    { screen: 'host_podium', vp: { width: 1920, height: 1080 }, filename: 'host_podium_tv.png', players: 6, lang: 'en' },

    { screen: 'host_lobby', vp: { width: 1366, height: 768 }, filename: 'host_lobby_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_question', vp: { width: 1366, height: 768 }, filename: 'host_question_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_voting', vp: { width: 1366, height: 768 }, filename: 'host_voting_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_reveal', vp: { width: 1366, height: 768 }, filename: 'host_reveal_laptop.png', players: 6, lang: 'en' },
    { screen: 'host_podium', vp: { width: 1366, height: 768 }, filename: 'host_podium_laptop.png', players: 6, lang: 'en' },
    
    { screen: 'host_lobby', vp: { width: 1228, height: 691 }, filename: 'host_lobby_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_question', vp: { width: 1228, height: 691 }, filename: 'host_question_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_voting', vp: { width: 1228, height: 691 }, filename: 'host_voting_scaled_laptop.png', players: 14, lang: 'ua' },
    { screen: 'host_reveal', vp: { width: 1228, height: 691 }, filename: 'host_reveal_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_podium', vp: { width: 1228, height: 691 }, filename: 'host_podium_scaled_laptop.png', players: 14, lang: 'en' },
    { screen: 'host_lobby', vp: { width: 768, height: 1024 }, filename: 'host_lobby_ipad_768.png', players: 6, lang: 'en' },
    { screen: 'host_lobby', vp: { width: 390, height: 844 }, filename: 'host_lobby_phone_390.png', players: 6, lang: 'ua' },
    { screen: 'player_lobby', vp: { width: 375, height: 667 }, filename: 'mobile_player_lobby_ua_375.png', players: 6, lang: 'ua', viewportMode: 'mobile' },
    { screen: 'player_lobby', vp: { width: 375, height: 667 }, filename: 'mobile_player_lobby_nonhost_375.png', players: 6, lang: 'en', viewportMode: 'mobile', pIndex: 1 },
    { screen: 'player_battle_single', vp: { width: 390, height: 844 }, filename: 'mobile_player_battle_single_390.png', players: 6, lang: 'en', viewportMode: 'mobile' },
    { screen: 'player_voting', vp: { width: 390, height: 844 }, filename: 'mobile_player_voting_390.png', players: 14, lang: 'en', viewportMode: 'mobile' },
    { screen: 'player_results', vp: { width: 390, height: 844 }, filename: 'mobile_player_results_en_390.png', players: 6, lang: 'en', viewportMode: 'mobile' },
    { screen: 'player_results', vp: { width: 390, height: 844 }, filename: 'mobile_player_results_ua_390.png', players: 6, lang: 'ua', viewportMode: 'mobile' },
    { screen: 'player_history', vp: { width: 375, height: 667 }, filename: 'mobile_battle_history_en_375.png', players: 6, lang: 'en', viewportMode: 'mobile' },
    { screen: 'player_history', vp: { width: 375, height: 667 }, filename: 'mobile_battle_history_ua_375.png', players: 6, lang: 'ua', viewportMode: 'mobile' },
    { screen: 'host_lobby', vp: { width: 2560, height: 1440 }, filename: 'host_lobby_2k_2560x1440.png', players: 6, lang: 'ua' },
    { screen: 'host_question', vp: { width: 2560, height: 1440 }, filename: 'host_question_2k_2560x1440.png', players: 6, lang: 'ua' },
    { screen: 'host_lobby', vp: { width: 2560, height: 1080 }, filename: 'host_lobby_ultrawide_2560x1080.png', players: 6, lang: 'ua' },
    { screen: 'host_lobby', vp: { width: 3440, height: 1440 }, filename: 'host_lobby_wqhd_3440x1440.png', players: 6, lang: 'ua' },
    { screen: 'host_lobby', vp: { width: 3840, height: 2160 }, filename: 'host_lobby_4k_3840x2160.png', players: 6, lang: 'ua' },
    { screen: 'host_lobby', vp: { width: 2560, height: 1440 }, filename: 'host_lobby_loading_themes_2k.png', players: 6, lang: 'ua', extraQuery: '&generatingThemes=1' },
    { screen: 'host_question', vp: { width: 3840, height: 2160 }, filename: 'host_question_4k_3840x2160.png', players: 6, lang: 'ua' },
    { screen: 'host_voting', vp: { width: 3840, height: 2160 }, filename: 'host_voting_4k_3840x2160.png', players: 6, lang: 'ua' },
    { screen: 'host_podium', vp: { width: 3840, height: 2160 }, filename: 'host_podium_4k_3840x2160.png', players: 6, lang: 'ua' },
    { route: '/', vp: { width: 390, height: 844 }, filename: 'retrowave_main_menu_phone.png', lang: 'ua' },
    { route: '/', vp: { width: 2560, height: 1440 }, filename: 'main_menu_2k_2560x1440.png', lang: 'ua' },
    { route: '/', vp: { width: 3840, height: 2160 }, filename: 'retrowave_main_menu_4k.png', lang: 'ua' },
    { screen: 'host_lobby', vp: { width: 3840, height: 2160 }, filename: 'retrowave_host_lobby_arcade_4k.png', players: 6, lang: 'ua' },
    { screen: 'host_lobby', vp: { width: 3840, height: 2160 }, filename: 'retrowave_host_lobby_outrun_4k.png', players: 6, lang: 'ua', extraQuery: '&colorTheme=outrun' },
    { screen: 'host_voting', vp: { width: 3840, height: 2160 }, filename: 'retrowave_host_voting_4k.png', players: 6, lang: 'ua' },
    { screen: 'host_voting', vp: { width: 3840, height: 2160 }, filename: 'sec2_host_voting_1v1_4k.png', players: 6, lang: 'ua', extraQuery: '&competitors=2' },
    { screen: 'host_voting', vp: { width: 3840, height: 2160 }, filename: 'sec2_host_voting_3way_4k.png', players: 6, lang: 'ua' },
    { screen: 'host_reveal', vp: { width: 3840, height: 2160 }, filename: 'sec2_host_reveal_1v1_4k.png', players: 6, lang: 'ua', extraQuery: '&competitors=2' },
];

test.describe('Capture Host UI Screenshots', () => {
    for (const cap of CAPTURES) {
        test(`Capture ${cap.filename}`, async ({ page }) => {
            await page.setViewportSize(cap.vp);
            if (cap.route) {
                await page.goto(cap.route);
                await page.waitForSelector('button:has-text("УКРАЇНСЬКА")');
                if (!cap.stayOnLanguage) {
                    await page.click(cap.lang === 'ua' ? 'button:has-text("УКРАЇНСЬКА")' : 'button:has-text("ENGLISH")');
                    await page.waitForSelector('button:has-text("СТВОРИТИ"), button:has-text("CREATE")');
                }
                await page.waitForTimeout(250);
            } else {
                const vpParam = cap.viewportMode || 'full';
                const pIdxParam = cap.pIndex !== undefined ? `&pIndex=${cap.pIndex}` : '';
                const extraQuery = cap.extraQuery || '';
                const url = `/?debug=${cap.screen}&players=${cap.players}&lang=${cap.lang || 'en'}&viewport=${vpParam}&hideToolbar=1${pIdxParam}${extraQuery}`;
                await page.goto(url);
                await page.waitForTimeout(cap.screen === 'host_reveal' ? 1150 : 400);
            }

            const outPath = path.join(ARTIFACT_DIR, cap.filename);
            await page.screenshot({ path: outPath, fullPage: false });
        });
    }

    test('Capture sec2_battle_recap_canvas_png', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto('/?debug=player_history&players=6&lang=en&viewport=mobile&hideToolbar=1');
        await page.waitForSelector('.save-btn-container button');
        await page.waitForTimeout(300);

        const landscapePromise = page.waitForEvent('download');
        await page.locator('.save-btn-container button').nth(1).click();
        const landscapeDl = await landscapePromise;
        await landscapeDl.saveAs(path.join(ARTIFACT_DIR, 'sec2_battle_recap_landscape_png.png'));

        const verticalPromise = page.waitForEvent('download');
        await page.locator('.save-btn-container button').first().click();
        const verticalDl = await verticalPromise;
        await verticalDl.saveAs(path.join(ARTIFACT_DIR, 'sec2_battle_recap_vertical_png.png'));
    });
});
