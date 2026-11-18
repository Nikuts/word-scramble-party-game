import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 90000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false, // Keep tests inside each file sequential while running slow files across 2 workers
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 2,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'node server.js',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI && process.env.PW_REUSE_SERVER === '1',
        env: {
            DISABLE_GEMINI_AI: '1',
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 30000,
    },
});
