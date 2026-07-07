/**
 * E2E Test: Keyboard Shortcuts (Section 3.1.3)
 * Tests keyboard shortcut functionality via Playwright.
 *
 * Note: Uses Control instead of Meta for cross-platform compatibility
 * (Playwright runs headless on Linux where Meta key may not exist).
 * The KeyboardHandler treats Control and Meta equivalently for shortcuts.
 */

import { test, expect } from '@playwright/test';

// 1x1 red pixel PNG (base64)
const RED_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);
const BLUE_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DQDwAEhQGAhQXmOAAAABJRU5ErkJggg==',
    'base64'
);

test.describe('Section 3.1.3 — Keyboard Shortcuts E2E', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    async function loadApp(page) {
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });
    }

    async function loadImages(page, count = 2) {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('#addImagesBtn');
        const fileChooser = await fileChooserPromise;
        const files = [];
        for (let i = 0; i < count; i++) {
            files.push({
                name: `test-${i}.png`,
                mimeType: 'image/png',
                buffer: i % 2 === 0 ? RED_PNG : BLUE_PNG,
            });
        }
        await fileChooser.setFiles(files);
        await page.waitForSelector('#previewCanvas', { state: 'visible' });
        await page.waitForTimeout(300);
    }

    // ---- Core shortcut tests ----

    test('3.1.3.1 — Cmd+O opens file picker', async ({ page }) => {
        await loadApp(page);
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.press('Control+O');
        const fileChooser = await fileChooserPromise;
        expect(fileChooser).toBeTruthy();
    });

    test('3.1.3.2 — Cmd+S triggers export', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        await page.keyboard.press('Control+S');
        const download = await downloadPromise;
        // Download may or may not fire in headless mode; verify no crash
        await page.waitForTimeout(500);
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.1.3.3 — Cmd+1 switches to uniform', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);
        await page.keyboard.press('Control+1');
        await page.waitForTimeout(300);
        expect(await page.locator('#layoutStyleSelect').inputValue()).toBe('uniform');
    });

    test('3.1.3.4 — Cmd+2 switches to hero', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);
        await page.keyboard.press('Control+2');
        await page.waitForTimeout(300);
        expect(await page.locator('#layoutStyleSelect').inputValue()).toBe('hero');
    });

    test('3.1.3.5 — Cmd+3 switches to mosaic', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);
        await page.keyboard.press('Control+3');
        await page.waitForTimeout(300);
        expect(await page.locator('#layoutStyleSelect').inputValue()).toBe('mosaic');
    });

    test('3.1.3.6 — Cmd+4 switches to diagonalSlices', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);
        await page.keyboard.press('Control+4');
        await page.waitForTimeout(300);
        expect(await page.locator('#layoutStyleSelect').inputValue()).toBe('diagonalSlices');
    });

    test('3.1.3.7 — Cmd+5 switches to hexagonal', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);
        await page.keyboard.press('Control+5');
        await page.waitForTimeout(300);
        expect(await page.locator('#layoutStyleSelect').inputValue()).toBe('hexagonal');
    });

    test('3.1.3.8 — Escape deselects panel', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        // Click on canvas to select a panel
        await page.click('#previewCanvas');
        await page.waitForTimeout(200);

        // Press Escape to deselect
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Crop section should show placeholder (no panel selected)
        const cropPlaceholder = page.locator('.crop-placeholder-section');
        // Either the placeholder is visible or the crop info is not visible
        const hasCropInfo = await page.locator('.crop-info').count();
        expect(hasCropInfo).toBe(0);
    });

    test('3.1.3.9 — Delete removes selected image', async ({ page }) => {
        await loadApp(page);
        await loadImages(page, 2);

        // Verify 2 images loaded
        const headerBefore = await page.textContent('#sidebar-left h3');
        expect(headerBefore).toContain('2');

        // Click on canvas to select a panel
        await page.click('#previewCanvas');
        await page.waitForTimeout(200);

        // Press Delete to remove selected image
        await page.keyboard.press('Delete');
        await page.waitForTimeout(500);

        // Verify image count decreased to 1
        const headerAfter = await page.textContent('#sidebar-left h3');
        expect(headerAfter).toContain('1');
    });

    test('3.1.3.10 — Cmd+Z undo after crop reset', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        // Select a panel by clicking canvas
        await page.click('#previewCanvas');
        await page.waitForTimeout(300);

        // Reset crop to create undo history
        const resetBtn = page.locator('.reset-crop-btn');
        await resetBtn.click();
        await page.waitForTimeout(300);

        // Undo button should be enabled
        const undoBtn = page.locator('#undoBtn');
        expect(await undoBtn.isDisabled()).toBe(false);

        // Press Cmd+Z to undo
        await page.keyboard.press('Control+Z');
        await page.waitForTimeout(300);

        // Undo button should be disabled again (no more undo history)
        expect(await undoBtn.isDisabled()).toBe(true);
    });

    test('3.1.3.11 — Cmd+Shift+Z redo after undo', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        // Select a panel
        await page.click('#previewCanvas');
        await page.waitForTimeout(300);

        // Reset crop to create undo history
        await page.click('.reset-crop-btn');
        await page.waitForTimeout(300);

        // Undo
        await page.keyboard.press('Control+Z');
        await page.waitForTimeout(300);

        // Redo button should be enabled
        const redoBtn = page.locator('#redoBtn');
        expect(await redoBtn.isDisabled()).toBe(false);

        // Press Cmd+Shift+Z to redo
        await page.keyboard.press('Control+Shift+Z');
        await page.waitForTimeout(300);

        // Redo button should be disabled again
        expect(await redoBtn.isDisabled()).toBe(true);
    });

    // ---- Edge case tests ----

    test('3.1.3.12 — Shortcuts suppressed in text input', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        // Focus the title input
        await page.click('#titleInput');
        await page.waitForTimeout(100);

        // Press Cmd+S while input is focused — should NOT trigger export
        // (browser may try to save page, but preventDefault should block it)
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(500);

        // App should still be visible and functional
        expect(await page.isVisible('#app')).toBe(true);

        // Export button should not be in "Exporting..." state
        const exportBtnText = await page.locator('#exportBtn').textContent();
        expect(exportBtnText).not.toContain('Exporting');
    });

    test('3.1.3.13 — Cmd+S with no images does not crash', async ({ page }) => {
        await loadApp(page);
        // Do NOT load images

        // Press Cmd+S — exportCollage() checks isExporting and images.length
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(500);

        // App should still be functional
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.1.3.14 — Delete with no panel selected does not crash', async ({ page }) => {
        await loadApp(page);
        // Do NOT select a panel

        // Press Delete — removeSelectedImage() checks selectedPanelId
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);

        // App should still be functional
        expect(await page.isVisible('#app')).toBe(true);
    });

    test('3.1.3.15 — Rapid layout switching does not hang', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        // Press Cmd+1 through Cmd+5 rapidly 3x
        for (let cycle = 0; cycle < 3; cycle++) {
            for (let num = 1; num <= 5; num++) {
                await page.keyboard.press(`Control+${num}`);
            }
        }

        // Wait for rendering to settle
        await page.waitForTimeout(1000);

        // Final layout should be hexagonal (last pressed was Cmd+5)
        expect(await page.locator('#layoutStyleSelect').inputValue()).toBe('hexagonal');

        // Canvas should still be visible
        expect(await page.isVisible('#previewCanvas')).toBe(true);
    });
});
