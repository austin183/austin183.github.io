/**
 * E2E Test: Landing Page Integration (Section 3.2.2)
 * Tests the CollageMaker project card on the root landing page
 * and navigation to the CollageMaker app.
 */

import { test, expect } from '@playwright/test';

test.describe('Section 3.2.2 — Landing Page Integration E2E', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    // ---- Core navigation tests (P0) ----

    test('3.2.2.1 — Landing page loads without errors', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.goto('/', { waitUntil: 'networkidle' });

        // Page should render without JS errors
        expect(consoleErrors.length).toBe(0);
    });

    test('3.2.2.2 — CollageMaker card is visible', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const card = page.locator('#collageMakerCard');
        await expect(card).toBeVisible();
    });

    test('3.2.2.3 — Card title displays "CollageMaker"', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const title = page.locator('#collageMakerCard .card-title');
        await expect(title).toContainText('CollageMaker');
    });

    test('3.2.2.4 — Launch button is clickable', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const launchBtn = page.locator('#collageMakerCard .launch-button');
        await expect(launchBtn).toBeVisible();
        await expect(launchBtn).toBeEnabled();
    });

    test('3.2.2.5 — Launch navigates to CollageMaker app', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const launchBtn = page.locator('#collageMakerCard .launch-button');
        await launchBtn.click();

        // URL should include CollageMaker
        await page.waitForURL(/\/CollageMaker\/index\.html/);
        expect(page.url()).toContain('/CollageMaker/index.html');
    });

    test('3.2.2.6 — CollageMaker app loads after navigation', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const launchBtn = page.locator('#collageMakerCard .launch-button');
        await launchBtn.click();

        // Vue app should mount
        await page.waitForSelector('#app', { state: 'visible' });
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.2.2.7 — CollageMaker canvas visible after navigation', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const launchBtn = page.locator('#collageMakerCard .launch-button');
        await launchBtn.click();

        // Canvas should be present (may show empty state)
        await page.waitForSelector('#previewCanvas', { state: 'visible' });
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });

    // ---- Edge case tests (P1) ----

    test('3.2.2.8 — Back button returns to landing page', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const launchBtn = page.locator('#collageMakerCard .launch-button');
        await launchBtn.click();
        await page.waitForURL(/\/CollageMaker\/index\.html/);

        // Go back
        await page.goBack();
        await page.waitForURL(/\/$/);
        expect(page.url()).toMatch(/\/$/);
    });

    test('3.2.2.9 — Card visible in dark theme', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        // Toggle to dark theme
        await page.click('.theme-toggle');
        await page.waitForTimeout(300);

        // Card should still be visible
        const card = page.locator('#collageMakerCard');
        await expect(card).toBeVisible();
    });

    test('3.2.2.10 — Direct URL access works', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate directly to CollageMaker
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // App should load without 404 for CSS/JS modules
        await page.waitForSelector('#app', { state: 'visible' });
        expect(await page.isVisible('#app')).toBe(true);

        // Filter out any non-404 errors (material-web warnings are OK)
        const resourceErrors = consoleErrors.filter(e =>
            e.includes('404') || e.includes('Failed to fetch')
        );
        expect(resourceErrors.length).toBe(0);
    });

    test('3.2.2.11 — Rapid Launch clicks — no crash', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        const launchBtn = page.locator('#collageMakerCard .launch-button');

        // Fire 5 rapid clicks simultaneously — some will fail because
        // the page navigates away, but none should crash the browser
        const clickPromises = [];
        for (let i = 0; i < 5; i++) {
            clickPromises.push(launchBtn.click().catch(() => {}));
        }
        await Promise.all(clickPromises);

        // Wait for navigation to settle
        await page.waitForURL(/\/CollageMaker\/index\.html/);

        // App should be visible and functional
        await page.waitForSelector('#app', { state: 'visible' });
        expect(await page.isVisible('#app')).toBe(true);
    });
});
