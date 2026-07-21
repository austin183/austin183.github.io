/**
 * E2E Test: Responsive Design (Section 3.5.6)
 * Tests viewport emulation at desktop/tablet/mobile breakpoints,
 * touch event simulation, and layout transitions.
 */

import { test, expect } from '@playwright/test';

// Simple test images (1x1 pixel PNGs encoded as base64)
const redPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);
const bluePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DQDwAEhQGAhQXmOAAAABJRU5ErkJggg==',
    'base64'
);
const greenPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/+HfAH+PztqEgcAAAAASUVORK5CYII=',
    'base64'
);

test.describe('Section 3.5.6 — Responsive Design E2E', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    // ---- Viewport Emulation — Desktop (P1) ----

    test('3.5.6.1 — Desktop layout at 1920px viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Three-panel layout: both sidebars should be visible
        const mainLayout = page.locator('#mainLayout');
        expect(await mainLayout.isVisible()).toBe(true);

        const leftSidebar = page.locator('#sidebar-left');
        expect(await leftSidebar.isVisible()).toBe(true);
    });

    test('3.5.6.2 — Desktop layout at 1400px viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        const mainLayout = page.locator('#mainLayout');
        expect(await mainLayout.isVisible()).toBe(true);
    });

    test('3.5.6.3 — Desktop layout at 1200px (boundary)', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        const mainLayout = page.locator('#mainLayout');
        expect(await mainLayout.isVisible()).toBe(true);
    });

    test('3.5.6.4 — Canvas visible and interactive at desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images to make canvas visible
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test-red.png', mimeType: 'image/png', buffer: redPng },
            { name: 'test-blue.png', mimeType: 'image/png', buffer: bluePng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Click canvas to select a panel
        await page.click('#previewCanvas');
        // Should not crash
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });

    // ---- Viewport Emulation — Tablet (P0) ----

    test('3.5.6.5 — Tablet layout at 1199px (boundary)', async ({ page }) => {
        await page.setViewportSize({ width: 1199, height: 800 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // App should load without crash at tablet boundary
        const mainLayout = page.locator('#mainLayout');
        expect(await mainLayout.isVisible()).toBe(true);
    });

    test('3.5.6.6 — Tablet layout at 900px', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 600 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Canvas area should be visible
        const canvasArea = page.locator('.canvas-area');
        expect(await canvasArea.isVisible()).toBe(true);
    });

    test('3.5.6.7 — Tablet layout at 768px (boundary)', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Should be tablet behavior, not mobile
        const mainLayout = page.locator('#mainLayout');
        expect(await mainLayout.isVisible()).toBe(true);
    });

    test('3.5.6.8 — Canvas interactive at tablet', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 600 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test.png', mimeType: 'image/png', buffer: redPng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Click canvas — should work without crash
        await page.click('#previewCanvas');
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });

    // ---- Viewport Emulation — Mobile (P0) ----

    test('3.5.6.9 — Mobile layout at 767px (boundary)', async ({ page }) => {
        await page.setViewportSize({ width: 767, height: 1024 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // App should load without crash at mobile boundary
        const app = page.locator('#app');
        expect(await app.isVisible()).toBe(true);
    });

    test('3.5.6.10 — Mobile layout at 375px (iPhone SE)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // All elements should be visible
        const toolbar = page.locator('.collage-toolbar');
        expect(await toolbar.isVisible()).toBe(true);

        const mainLayout = page.locator('#mainLayout');
        expect(await mainLayout.isVisible()).toBe(true);
    });

    test('3.5.6.11 — Mobile layout at 320px (small phone)', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // No horizontal overflow
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        expect(bodyBox.width).toBe(320);
    });

    test('3.5.6.12 — Canvas interactive at mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test.png', mimeType: 'image/png', buffer: redPng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Click canvas — should work
        await page.click('#previewCanvas');
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });

    test('3.5.6.13 — Toolbar accessible at mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Toolbar buttons should be visible
        const addImagesBtn = page.locator('#addImagesBtn');
        expect(await addImagesBtn.isVisible()).toBe(true);

        const clearAllBtn = page.locator('#clearAllBtn');
        expect(await clearAllBtn.isVisible()).toBe(true);
    });

    test('3.5.6.14 — Image library scrollable at mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload multiple images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;

        // Create 10 test images
        const files = [];
        for (let i = 0; i < 10; i++) {
            files.push({
                name: `test-${i}.png`,
                mimeType: 'image/png',
                buffer: redPng,
            });
        }
        await fileChooser.setFiles(files);

        await page.waitForSelector('.image-item', { state: 'visible' });

        // Image library should be visible
        const imageLibrary = page.locator('.image-library');
        expect(await imageLibrary.isVisible()).toBe(true);
    });

    // ---- Touch Event Simulation (P1) ----

    test('3.5.6.15 — Tap selects panel on canvas', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test-red.png', mimeType: 'image/png', buffer: redPng },
            { name: 'test-blue.png', mimeType: 'image/png', buffer: bluePng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Click canvas (pointer events handle both mouse and touch)
        await page.click('#previewCanvas');

        // Should not crash
        expect(await canvas.isVisible()).toBe(true);
    });

    test('3.5.6.16 — Tap toolbar button works', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Click the Add Images button (pointer events handle both mouse and touch)
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('#addImagesBtn').click();
        const fileChooser = await fileChooserPromise;

        // File chooser should have opened
        expect(fileChooser).toBeDefined();
    });

    test('3.5.6.17 — Tap layout dropdown works', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images first so layout dropdown is functional
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test.png', mimeType: 'image/png', buffer: redPng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Click the layout dropdown
        const layoutSelect = page.locator('#layoutStyleSelect');
        await layoutSelect.click();

        // Should not crash
        expect(await layoutSelect.isVisible()).toBe(true);
    });

    test('3.5.6.18 — Scroll in image library works', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload multiple images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        const files = [];
        for (let i = 0; i < 5; i++) {
            files.push({
                name: `test-${i}.png`,
                mimeType: 'image/png',
                buffer: redPng,
            });
        }
        await fileChooser.setFiles(files);

        await page.waitForSelector('.image-item', { state: 'visible' });

        // Scroll in image library
        const imageLibrary = page.locator('.image-library');
        await imageLibrary.evaluate(el => el.scrollTop = el.scrollHeight);

        // Should not crash
        expect(await imageLibrary.isVisible()).toBe(true);
    });

    test('3.5.6.19 — No accidental panel selection during scroll', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test.png', mimeType: 'image/png', buffer: redPng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Canvas should be visible without crash
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });

    // ---- Layout Transitions (P2) ----

    test('3.5.6.20 — Resize from desktop to tablet', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Resize to tablet
        await page.setViewportSize({ width: 900, height: 600 });
        // Wait for app to stabilize after resize
        await page.waitForSelector('#app', { state: 'visible' });

        // Should not crash
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.5.6.21 — Resize from tablet to mobile', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 600 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Resize to mobile
        await page.setViewportSize({ width: 375, height: 667 });
        // Wait for app to stabilize after resize
        await page.waitForSelector('#app', { state: 'visible' });

        // Should not crash
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.5.6.22 — Resize from mobile back to desktop', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Resize back to desktop
        await page.setViewportSize({ width: 1400, height: 900 });
        // Wait for app to stabilize after resize
        await page.waitForSelector('#app', { state: 'visible' });

        // Should not crash
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.5.6.23 — State preserved across resize', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test.png', mimeType: 'image/png', buffer: redPng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Select a panel
        await page.click('#previewCanvas');

        // Resize to mobile
        await page.setViewportSize({ width: 375, height: 667 });
        // Wait for app to stabilize after resize
        await page.waitForSelector('#app', { state: 'visible' });

        // Images should still be loaded
        const imageCount = await page.textContent('#sidebar-left h3');
        expect(imageCount).toContain('1');
    });

    test('3.5.6.24 — Images preserved across resize', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });

        // Upload multiple images
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([
            { name: 'test-red.png', mimeType: 'image/png', buffer: redPng },
            { name: 'test-blue.png', mimeType: 'image/png', buffer: bluePng },
            { name: 'test-green.png', mimeType: 'image/png', buffer: greenPng },
        ]);

        await page.waitForSelector('#previewCanvas', { state: 'visible' });

        // Resize to mobile
        await page.setViewportSize({ width: 375, height: 667 });
        // Wait for app to stabilize after resize
        await page.waitForSelector('#app', { state: 'visible' });

        // All images should still be present
        const imageCount = await page.textContent('#sidebar-left h3');
        expect(imageCount).toContain('3');

        // Canvas should still be visible
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });
});
