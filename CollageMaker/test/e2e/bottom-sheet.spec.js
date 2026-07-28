/**
 * E2E Test: Bottom Sheet Focus Trap (Phase 2)
 * Tests focus trap behavior for the mobile bottom sheet aria-modal dialog.
 *
 * Covers: BS-FT-E2E-01 through BS-FT-E2E-07
 * Plan: _agent_docs/plans/2026-07-27-mobile-bottom-sheet-review-followups.md
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

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

test.describe('Bottom Sheet — Focus Trap (Phase 2)', () => {
    test.use({ baseURL: 'http://localhost:8000' });

    async function loadApp(page) {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.waitForSelector('#app', { state: 'visible' });
    }

    async function openBottomSheet(page) {
        await page.click('#bottomSheetToggleBtn');
        // Wait for bottom sheet to open (CSS transition: 0.3s)
        await page.waitForSelector('#bottomSheet.bottom-sheet-open', { state: 'visible' });
        await page.waitForTimeout(400); // Allow $nextTick + CSS transition to settle
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

    /**
     * Get the ID of the currently focused element.
     */
    async function getFocusedId(page) {
        return page.evaluate(() => document.activeElement?.id || null);
    }

    /**
     * Get the tag name of the currently focused element.
     */
    async function getFocusedTag(page) {
        return page.evaluate(() => document.activeElement?.tagName || null);
    }

    /**
     * Check if the currently focused element is a descendant of the bottom sheet.
     */
    async function isFocusInBottomSheet(page) {
        return page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            const active = document.activeElement;
            if (!sheet || !active || active === document.body) return false;
            return sheet.contains(active);
        });
    }

    /**
     * Get all focusable elements within the bottom sheet that are visible.
     * Returns descriptors that include a unique index for elements without IDs.
     */
    async function getFocusableElements(page) {
        return page.evaluate((selector) => {
            const sheet = document.getElementById('bottomSheet');
            if (!sheet) return [];
            return Array.from(sheet.querySelectorAll(selector))
                .filter(el => el.offsetParent !== null)
                .map((el, idx) => ({ id: el.id, tagName: el.tagName, index: idx }));
        }, FOCUSABLE_SELECTOR);
    }

    /**
     * Focus the focusable element at the given index within the bottom sheet.
     * Uses index-based targeting since many elements (e.g., remove buttons) lack IDs.
     */
    async function focusElementByIndex(page, index) {
        return page.evaluate(({ selector, idx }) => {
            const sheet = document.getElementById('bottomSheet');
            if (!sheet) return false;
            const elements = Array.from(sheet.querySelectorAll(selector))
                .filter(el => el.offsetParent !== null);
            if (idx >= 0 && idx < elements.length) {
                elements[idx].focus();
                return true;
            }
            return false;
        }, { selector: FOCUSABLE_SELECTOR, idx: index });
    }

    /**
     * Get the ID of the focusable element at the given index.
     */
    async function getElementIdByIndex(page, index) {
        return page.evaluate(({ selector, idx }) => {
            const sheet = document.getElementById('bottomSheet');
            if (!sheet) return null;
            const elements = Array.from(sheet.querySelectorAll(selector))
                .filter(el => el.offsetParent !== null);
            if (idx >= 0 && idx < elements.length) {
                return elements[idx].id || null;
            }
            return null;
        }, { selector: FOCUSABLE_SELECTOR, idx: index });
    }

    /**
     * Close the bottom sheet by clicking the backdrop overlay.
     * The backdrop (#sidebarOverlay) has @click="closeSidebars" which closes all overlays.
     * z-index: backdrop=140, bottom sheet=160, so we click above the sheet area.
     */
    async function closeBottomSheetViaBackdrop(page) {
        // The bottom sheet covers the bottom ~70% of the viewport.
        // Click near the top of the screen where only the backdrop is visible.
        // Using mouse.click() at a specific coordinate avoids the "intercepts pointer events" issue.
        await page.mouse.click(100, 100);
        await page.waitForTimeout(400); // Allow CSS transition to complete
    }

    // ---- BS-FT-E2E-01: Focus moves to Images tab on open ----

    test('BS-FT-E2E-01 — Focus moves to Images tab on open', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        const focusedId = await getFocusedId(page);
        expect(focusedId).toBe('bs-tab-images');
    });

    // ---- BS-FT-E2E-02: Tab cycles within bottom sheet ----

    test('BS-FT-E2E-02 — Tab cycles within bottom sheet (focus stays contained)', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        // Press Tab several times — focus should stay within bottom sheet
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(50);
        }

        const inSheet = await isFocusInBottomSheet(page);
        expect(inSheet).toBe(true);
    });

    // ---- BS-FT-E2E-03: Tab wraps from last to first ----

    test('BS-FT-E2E-03 — Tab wraps from last focusable element to first', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        // Get focusable elements and programmatically focus the last one
        const elements = await getFocusableElements(page);
        expect(elements.length).toBeGreaterThan(1);

        const lastIndex = elements.length - 1;
        const firstId = elements[0].id; // First element is always bs-tab-images (has ID)

        // Focus the last element by index (many elements lack IDs)
        await focusElementByIndex(page, lastIndex);
        await page.waitForTimeout(50);

        // Press Tab — should wrap to first element
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        const focusedId = await getFocusedId(page);
        expect(focusedId).toBe(firstId);
    });

    // ---- BS-FT-E2E-04: Shift+Tab wraps from first to last ----

    test('BS-FT-E2E-04 — Shift+Tab wraps from first focusable element to last', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        // Get focusable elements
        const elements = await getFocusableElements(page);
        expect(elements.length).toBeGreaterThan(1);

        const firstEl = elements[0]; // bs-tab-images (always has ID)
        const lastEl = elements[elements.length - 1];
        const lastIndex = elements.length - 1;

        // Focus the first element by ID (bs-tab-images always has an ID)
        await page.evaluate((id) => {
            const el = document.getElementById(id);
            if (el) el.focus();
        }, firstEl.id);

        await page.waitForTimeout(50);

        // Press Shift+Tab — should wrap to last element
        await page.keyboard.press('Shift+Tab');
        await page.waitForTimeout(100);

        // Last element may not have an ID, so verify by checking:
        // 1. Focus is still within bottom sheet
        // 2. The focused element is at the expected index position
        // 3. The focused element matches the last element's tag name
        const inSheet = await isFocusInBottomSheet(page);
        expect(inSheet).toBe(true);

        const focusedTag = await getFocusedTag(page);
        expect(focusedTag).toBe(lastEl.tagName);

        // Verify the focused element is actually the last focusable element
        // by checking it matches the element at the last index
        const focusedId = await getFocusedId(page);
        const lastElementId = await getElementIdByIndex(page, lastIndex);
        if (lastElementId) {
            // If the last element has an ID, verify exact match
            expect(focusedId).toBe(lastElementId);
        }
        // If no ID, the tag name check above is sufficient
    });

    // ---- BS-FT-E2E-05: Dismissal returns focus to hamburger ----

    test('BS-FT-E2E-05 — Dismissal returns focus to hamburger button', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        // Verify focus is in bottom sheet before dismissal
        const inSheetBefore = await isFocusInBottomSheet(page);
        expect(inSheetBefore).toBe(true);

        // Dismiss via backdrop click — this exercises the same closeSidebars()
        // code path as Escape key, including focus return to hamburger button.
        // Note: Playwright's page.keyboard.press('Escape') with Vue's
        // @keydown.escape.window.prevent is unreliable in headless mode.
        // The unit tests (BS-FT-13) cover closeSidebars() focus return directly.
        await closeBottomSheetViaBackdrop(page);

        // Bottom sheet should be closed
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(false);

        // Focus should return to hamburger button
        const focusedId = await getFocusedId(page);
        expect(focusedId).toBe('bottomSheetToggleBtn');
    });

    // ---- BS-FT-E2E-06: Focus stays in sheet when switching tabs ----

    test('BS-FT-E2E-06 — Focus stays within bottom sheet when switching tabs', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        // Verify focus is on Images tab
        let focusedId = await getFocusedId(page);
        expect(focusedId).toBe('bs-tab-images');

        // Click Edit tab
        await page.click('#bs-tab-edit');
        await page.waitForTimeout(100);

        // Press Tab — focus should move to first focusable element in Edit panel
        // (or stay within bottom sheet if Edit panel has no visible focusable elements)
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        // Focus should still be within bottom sheet
        const inSheet = await isFocusInBottomSheet(page);
        expect(inSheet).toBe(true);
    });

    // ---- BS-FT-E2E-07: Swipe dismiss releases focus trap ----

    test('BS-FT-E2E-07 — Swipe dismiss closes sheet and returns focus to hamburger', async ({ page }) => {
        await loadApp(page);
        await loadImages(page);

        await openBottomSheet(page);

        // Verify focus is in bottom sheet before swipe
        const inSheetBefore = await isFocusInBottomSheet(page);
        expect(inSheetBefore).toBe(true);

        // Simulate swipe-to-dismiss via touch events
        // The bottom sheet content area has @touchstart.passive and @touchend.passive handlers.
        //
        // NOTE: We use plain Event objects with patched touch properties via Object.defineProperty
        // instead of new TouchEvent(). This works because:
        // 1. The Vue handler only reads event.touches[0].clientY and event.changedTouches[0].clientY
        // 2. It does NOT check instanceof TouchEvent or access Touch-specific properties
        // 3. This pattern is consistent with the building-web-apps skill reference on TouchEvent mocking
        // 4. Playwright's touchscreen API does not reliably trigger passive Vue touch handlers
        await page.evaluate(() => {
            const content = document.querySelector('.bottom-sheet-content');
            if (!content) return;

            // Create mock touch lists
            function makeTouchList(touches) {
                const list = { length: touches.length, item: (i) => touches[i] || null };
                for (let i = 0; i < touches.length; i++) list[i] = touches[i];
                return list;
            }

            function addTouchProps(evt, props) {
                for (const [key, value] of Object.entries(props)) {
                    Object.defineProperty(evt, key, { value, writable: false, enumerable: true, configurable: true });
                }
            }

            // touchstart at top of content area
            const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
            addTouchProps(touchStart, {
                touches: makeTouchList([{ clientY: 100 }]),
                targetTouches: makeTouchList([{ clientY: 100 }]),
                changedTouches: makeTouchList([]),
            });
            content.dispatchEvent(touchStart);

            // touchend with large downward swipe (200px — exceeds threshold of max(60, 667*0.08)=53)
            const touchEnd = new Event('touchend', { bubbles: true, cancelable: true });
            addTouchProps(touchEnd, {
                touches: makeTouchList([]),
                targetTouches: makeTouchList([]),
                changedTouches: makeTouchList([{ clientY: 300 }]),
            });
            content.dispatchEvent(touchEnd);
        });

        await page.waitForTimeout(400); // Allow CSS transition to complete

        // Bottom sheet should be closed
        const sheetOpen = await page.evaluate(() => {
            const sheet = document.getElementById('bottomSheet');
            return sheet ? sheet.classList.contains('bottom-sheet-open') : false;
        });
        expect(sheetOpen).toBe(false);

        // Focus should return to hamburger button
        const focusedId = await getFocusedId(page);
        expect(focusedId).toBe('bottomSheetToggleBtn');
    });
});
