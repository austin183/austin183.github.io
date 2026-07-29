/**
 * E2E Test: Mobile FAB (Phase 2)
 * Tests the floating action button that replaces the hamburger menu
 * for toggling the mobile bottom sheet.
 *
 * Covers: 2.4.e.1 through 2.4.e.7
 * Plan: _agent_docs/plans/2026-07-28-expander-icon-and-positions-implementation.md
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

test.describe('Mobile FAB — Phase 2', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    async function loadDesktop(page) {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });
    }

    async function loadMobile(page) {
        await page.setViewportSize({ width: 375, height: 667 });
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
                buffer: i % 2 === 0 ? redPng : bluePng,
            });
        }
        await fileChooser.setFiles(files);
        await page.waitForSelector('#previewCanvas', { state: 'visible' });
        await page.waitForTimeout(300);
    }

    // ---- 2.4.e.1: FAB visible on mobile ----

    test('2.4.e.1 — FAB visible on mobile viewport', async ({ page }) => {
        await loadMobile(page);

        const fab = page.locator('#bottomSheetToggleBtn');
        expect(await fab.isVisible()).toBe(true);

        const classes = await fab.getAttribute('class');
        expect(classes).toContain('mobile-fab');
    });

    // ---- 2.4.e.2: FAB hidden on desktop ----

    test('2.4.e.2 — FAB hidden on desktop viewport', async ({ page }) => {
        await loadDesktop(page);

        const fab = page.locator('#bottomSheetToggleBtn');
        expect(await fab.isVisible()).toBe(false);
    });

    // ---- 2.4.e.3: FAB opens bottom sheet ----

    test('2.4.e.3 — FAB opens bottom sheet and icon changes to keyboard_arrow_down', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page);

        const fab = page.locator('#bottomSheetToggleBtn');
        const icon = fab.locator('.material-icons');

        // Initially closed — icon should be keyboard_arrow_up
        let iconText = await icon.textContent();
        expect(iconText.trim()).toBe('keyboard_arrow_up');

        // aria-expanded should be false
        expect(await fab.getAttribute('aria-expanded')).toBe('false');

        // Click FAB to open bottom sheet
        await fab.click();
        await page.waitForSelector('#bottomSheet.bottom-sheet-open', { state: 'visible' });
        await page.waitForTimeout(400);

        // Bottom sheet should be open
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(true);

        // Icon should change to keyboard_arrow_down
        iconText = await icon.textContent();
        expect(iconText.trim()).toBe('keyboard_arrow_down');

        // aria-expanded should be true
        expect(await fab.getAttribute('aria-expanded')).toBe('true');
    });

    // ---- 2.4.e.4: FAB closes bottom sheet ----

    test('2.4.e.4 — FAB closes bottom sheet and icon changes back to keyboard_arrow_up', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page);

        const fab = page.locator('#bottomSheetToggleBtn');
        const icon = fab.locator('.material-icons');

        // Open bottom sheet first
        await fab.click();
        await page.waitForSelector('#bottomSheet.bottom-sheet-open', { state: 'visible' });
        await page.waitForTimeout(400);

        // Verify sheet is open
        let sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(true);

        // Icon should be keyboard_arrow_down
        let iconText = await icon.textContent();
        expect(iconText.trim()).toBe('keyboard_arrow_down');

        // Click FAB to close bottom sheet
        await fab.click();
        await page.waitForTimeout(400);

        // Bottom sheet should be closed
        sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(false);

        // Icon should change back to keyboard_arrow_up
        iconText = await icon.textContent();
        expect(iconText.trim()).toBe('keyboard_arrow_up');
    });

    // ---- 2.4.e.5: FAB doesn't block bottom sheet content ----

    test('2.4.e.5 — Bottom sheet content is scrollable and not obscured by FAB', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page, 5);

        const fab = page.locator('#bottomSheetToggleBtn');

        // Open bottom sheet
        await fab.click();
        await page.waitForSelector('#bottomSheet.bottom-sheet-open', { state: 'visible' });
        await page.waitForTimeout(400);

        // Verify the bottom sheet content area is scrollable
        const contentScrollable = await page.evaluate(() => {
            const content = document.querySelector('.bottom-sheet-content');
            if (!content) return false;
            // Check that the content can scroll (scrollHeight > clientHeight)
            return content.scrollHeight > content.clientHeight;
        });
        // With 5 images, the content should be scrollable
        expect(contentScrollable).toBe(true);

        // Verify FAB z-index is above bottom sheet
        const fabZIndex = await fab.evaluate(el => window.getComputedStyle(el).zIndex);
        expect(fabZIndex).toBe('200');

        const sheetZIndex = await page.locator('#bottomSheet').evaluate(el => window.getComputedStyle(el).zIndex);
        expect(sheetZIndex).toBe('160');
    });

    // ---- 2.4.e.6: FAB aria-label is dynamic ----

    test('2.4.e.6 — FAB aria-label changes between "Open menu" and "Close menu"', async ({ page }) => {
        await loadMobile(page);

        const fab = page.locator('#bottomSheetToggleBtn');

        // Initially closed — aria-label should be "Open menu"
        expect(await fab.getAttribute('aria-label')).toBe('Open menu');

        // Open bottom sheet
        await fab.click();
        await page.waitForTimeout(200);

        // Now open — aria-label should be "Close menu"
        expect(await fab.getAttribute('aria-label')).toBe('Close menu');

        // Close bottom sheet
        await fab.click();
        await page.waitForTimeout(200);

        // Back to "Open menu"
        expect(await fab.getAttribute('aria-label')).toBe('Open menu');
    });

    // ---- 2.4.e.7: Existing bottom sheet tests still pass (regression) ----

    test('2.4.e.7 — Bottom sheet toggle still works via FAB (regression for bottom-sheet.spec.js)', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page);

        const fab = page.locator('#bottomSheetToggleBtn');

        // Open bottom sheet via FAB
        await fab.click();
        await page.waitForSelector('#bottomSheet.bottom-sheet-open', { state: 'visible' });
        await page.waitForTimeout(400);

        // Verify focus moved to Images tab (existing behavior from bottom-sheet.spec.js)
        const focusedId = await page.evaluate(() => document.activeElement?.id || null);
        expect(focusedId).toBe('bs-tab-images');

        // Dismiss via backdrop click — this exercises the same closeSidebars() code path
        await page.mouse.click(100, 100);
        await page.waitForTimeout(400);

        // Bottom sheet should be closed
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(false);

        // Focus should return to FAB
        const returnedFocusId = await page.evaluate(() => document.activeElement?.id || null);
        expect(returnedFocusId).toBe('bottomSheetToggleBtn');
    });

    // ---- Additional: FAB aria-controls ----

    test('FAB-E2E-01 — FAB has aria-controls="bottomSheet"', async ({ page }) => {
        await loadMobile(page);

        const fab = page.locator('#bottomSheetToggleBtn');
        expect(await fab.getAttribute('aria-controls')).toBe('bottomSheet');
    });

    // ---- Additional: FAB keyboard operability ----

    test('FAB-E2E-02 — FAB activates on Enter key', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page);

        const fab = page.locator('#bottomSheetToggleBtn');

        // Focus the FAB
        await fab.focus();
        expect(await page.evaluate(() => document.activeElement?.id)).toBe('bottomSheetToggleBtn');

        // Press Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);

        // Bottom sheet should be open
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(true);
    });

    test('FAB-E2E-03 — FAB activates on Space key', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page);

        const fab = page.locator('#bottomSheetToggleBtn');

        // Focus the FAB
        await fab.focus();

        // Press Space
        await page.keyboard.press('Space');
        await page.waitForTimeout(400);

        // Bottom sheet should be open
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(true);
    });

    // ---- Additional: Rapid toggle ----

    test('FAB-E2E-04 — Rapid toggle does not corrupt state', async ({ page }) => {
        await loadMobile(page);
        await loadImages(page);

        const fab = page.locator('#bottomSheetToggleBtn');

        // Rapid open/close/open
        await fab.click();
        await page.waitForTimeout(100);
        await fab.click();
        await page.waitForTimeout(100);
        await fab.click();
        await page.waitForTimeout(400);

        // Bottom sheet should be open (odd number of clicks)
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(true);

        // Icon should be keyboard_arrow_down
        const icon = fab.locator('.material-icons');
        expect(await icon.textContent()).toContain('keyboard_arrow_down');
    });

    // ---- Additional: Old hamburger removed from toolbar ----

    test('FAB-E2E-05 — Toolbar no longer contains hamburger button on mobile', async ({ page }) => {
        await loadMobile(page);

        const toolbar = page.locator('#toolbar');
        // Check that there's no button with toggleBottomSheet handler inside toolbar
        const buttons = toolbar.locator('button');
        const count = await buttons.count();

        // Verify none of the toolbar buttons have toggleBottomSheet
        for (let i = 0; i < count; i++) {
            const clickHandler = await buttons.nth(i).getAttribute('@click');
            if (clickHandler) {
                expect(clickHandler).not.toContain('toggleBottomSheet');
            }
        }
    });
});
