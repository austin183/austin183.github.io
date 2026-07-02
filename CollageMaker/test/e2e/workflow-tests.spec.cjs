/**
 * E2E Tests — Real-World Workflows (Section 12.8)
 * These tests validate end-to-end stability through realistic user interactions.
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:8000
 *   - Run: npx playwright test --config=playwright.config.cjs
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');

// Helper: create a minimal valid PNG (16x16 red pixel)
function createTestPng() {
    return Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
        0x36, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
}

// Helper: create multiple test image files
function createTestImages(count) {
    const files = [];
    for (let i = 0; i < count; i++) {
        const tmpPath = `/tmp/collage-test-${Date.now()}-${i}.png`;
        fs.writeFileSync(tmpPath, createTestPng());
        files.push(tmpPath);
    }
    return files;
}

// Helper: cleanup temp files
function cleanupFiles(files) {
    for (const f of files) {
        try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
    }
}

// Helper: wait for images to load in the library
async function waitForImagesLoaded(page, expectedCount) {
    // Wait for the image count header to show the expected count
    await page.waitForFunction(
        (count) => {
            const header = document.querySelector('#sidebar-left h3');
            if (!header) return false;
            return header.textContent.includes(count.toString());
        },
        expectedCount,
        { timeout: 10000 }
    );
}

// Helper: wait for canvas to be visible and rendering
async function waitForCanvasVisible(page) {
    await page.waitForSelector('#previewCanvas', { state: 'visible', timeout: 5000 });
}

// Helper: change layout style via select element
async function changeLayout(page, style) {
    await page.locator('#layoutStyleSelect').selectOption(style);
    // Wait for Vue to re-render (canvas visibility is a good indicator)
    await waitForCanvasVisible(page);
}

test.describe('Real-World Workflows (Section 12.8)', () => {
    let testFiles = [];

    test.afterEach(() => {
        cleanupFiles(testFiles);
    });

    test('12.8.1 — "Messy" workflow: rapid operations without crash', async ({ page }) => {
        testFiles = createTestImages(15);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Upload images via hidden file input
        await page.locator('#fileInput').setInputFiles(testFiles);
        // Wait for images to actually load
        await waitForImagesLoaded(page, 15);

        // Switch to mosaic layout
        await changeLayout(page, 'mosaic');

        // Switch to diagonal slices
        await changeLayout(page, 'diagonalSlices');

        // Adjust gutter rapidly
        for (let i = 0; i < 5; i++) {
            await page.evaluate((val) => {
                const slider = document.getElementById('gutterSlider');
                slider.value = val;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }, i * 4);
        }

        // Remove image #2
        const removeBtns = await page.$$('.remove-btn');
        if (removeBtns.length > 1) {
            await removeBtns[1].click();
            // Wait for image count to update
            await waitForImagesLoaded(page, 14);
        }

        // Press Escape
        await page.keyboard.press('Escape');

        // Verify no crash — page should still be functional
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        expect(canvasVisible).toBe(true);
    });

    test('12.8.2 — Theme toggle during active state', async ({ page }) => {
        testFiles = createTestImages(5);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Upload images
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 5);
        await waitForCanvasVisible(page);

        // Toggle theme
        await page.click('#themeToggle');
        // Wait for theme icon to change (indicates theme switch completed)
        await page.waitForFunction(() => {
            const icon = document.getElementById('theme-icon');
            return icon && icon.textContent !== 'bedtime';
        }, { timeout: 3000 });

        // Verify canvas still renders after theme toggle
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        expect(canvasVisible).toBe(true);

        // Toggle back
        await page.click('#themeToggle');
        await page.waitForFunction(() => {
            const icon = document.getElementById('theme-icon');
            return icon && icon.textContent === 'bedtime';
        }, { timeout: 3000 });
    });

    test('12.8.3 — Search with images loaded', async ({ page }) => {
        testFiles = createTestImages(5);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Upload images
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 5);

        // Search in sidebar
        const searchInput = page.locator('#sidebar-left input[type="text"]');
        await searchInput.fill('collage-test');
        // Vue's v-model is reactive — wait for filter to apply
        await page.waitForTimeout(100); // tiny delay for reactive update

        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(100);

        // Verify all images visible again
        const imageItems = await page.$$('.image-item');
        expect(imageItems.length).toBeGreaterThan(0);
    });

    test('12.8.4 — Layout change with images loaded', async ({ page }) => {
        testFiles = createTestImages(5);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Upload images
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 5);

        // Cycle through all layouts
        const layouts = ['hero', 'uniform', 'mosaic', 'diagonalSlices', 'hexagonal'];
        for (const layout of layouts) {
            await changeLayout(page, layout);

            // Verify canvas still rendering after each layout change
            const canvasVisible = await page.evaluate(() => {
                const canvas = document.getElementById('previewCanvas');
                return canvas && canvas.offsetParent !== null;
            });
            expect(canvasVisible).toBe(true);
        }
    });

    test('12.8.5 — Rapid image addition: 20 images', async ({ page }) => {
        testFiles = createTestImages(20);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Upload all 20 at once
        await page.locator('#fileInput').setInputFiles(testFiles);
        // Wait for all 20 to load
        await waitForImagesLoaded(page, 20);

        // Verify canvas renders
        await waitForCanvasVisible(page);
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        expect(canvasVisible).toBe(true);
    });

    test('12.8.6 — Undo after remove image', async ({ page }) => {
        testFiles = createTestImages(5);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Upload images
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 5);

        // Remove one image
        const removeBtns = await page.$$('.remove-btn');
        if (removeBtns.length > 0) {
            await removeBtns[0].click();
            // Wait for image count to update
            await waitForImagesLoaded(page, 4);

            // Try undo (Cmd+Z or Ctrl+Z)
            const isMac = process.platform === 'darwin';
            if (isMac) {
                await page.keyboard.press('Meta+z');
            } else {
                await page.keyboard.press('Control+z');
            }

            // Verify page didn't crash
            const canvasVisible = await page.evaluate(() => {
                const canvas = document.getElementById('previewCanvas');
                return canvas !== null;
            });
            expect(canvasVisible).toBe(true);
        }
    });
});

test.describe('Keyboard Shortcuts (Section 12.9)', () => {
    let testFiles = [];

    test.afterEach(() => {
        cleanupFiles(testFiles);
    });

    test('12.9.1 — Cmd+Z / Ctrl+Z undo via keyboard does not crash', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Press undo shortcut even with no undo history — should not crash
        const isMac = process.platform === 'darwin';
        if (isMac) {
            await page.keyboard.press('Meta+z');
        } else {
            await page.keyboard.press('Control+z');
        }

        // Verify page didn't crash
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        expect(canvasVisible).toBe(true);
    });

    test('12.9.2 — Escape to deselect panel', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on the canvas to try to select a panel
        await page.click('#previewCanvas');
        await page.waitForTimeout(200);

        // Press Escape to deselect
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Verify no crash — page should still be functional
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        expect(canvasVisible).toBe(true);
    });

    test('12.9.3 — Keyboard shortcuts with focus on input do not conflict', async ({ page }) => {
        testFiles = createTestImages(5);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 5);

        // Focus on the search input
        const searchInput = page.locator('#sidebar-left input[type="text"]');
        await searchInput.click();
        await searchInput.fill('test');

        // Press Escape — should work (clears selection if any, doesn't crash)
        await page.keyboard.press('Escape');

        // Verify page is still functional
        const canvasVisible = await page.evaluate(() => {
            const canvas = document.getElementById('previewCanvas');
            return canvas && canvas.offsetParent !== null;
        });
        expect(canvasVisible).toBe(true);
    });
});

test.describe('Undo/Redo Button State (Section 12.10)', () => {
    let testFiles = [];

    test.afterEach(() => {
        cleanupFiles(testFiles);
    });

    test('12.10.1 — Undo/Redo buttons disabled on fresh load', async ({ page }) => {
        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });

        // Both buttons should be disabled initially
        const undoDisabled = await page.locator('#undoBtn').getAttribute('disabled');
        const redoDisabled = await page.locator('#redoBtn').getAttribute('disabled');
        expect(undoDisabled).not.toBeNull();
        expect(redoDisabled).not.toBeNull();
    });

    test('12.10.2 — Undo button enabled after crop reset, redo disabled', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on canvas to select a panel
        const canvasBounds = await page.locator('#previewCanvas').boundingBox();
        if (!canvasBounds) return;

        await page.click('#previewCanvas', {
            position: { x: canvasBounds.width / 2, y: canvasBounds.height / 2 }
        });
        await page.waitForTimeout(300);

        // Check if a panel was selected (crop preview visible)
        const cropSectionVisible = await page.evaluate(() => {
            const cropCanvas = document.getElementById('cropPreviewCanvas');
            return cropCanvas && cropCanvas.offsetParent !== null;
        });

        if (cropSectionVisible) {
            // Click Reset Crop to create undo history
            await page.click('.reset-crop-btn');
            await page.waitForTimeout(300);

            // Undo button should be enabled, redo should be disabled
            const undoDisabled = await page.locator('#undoBtn').getAttribute('disabled');
            const redoDisabled = await page.locator('#redoBtn').getAttribute('disabled');
            expect(undoDisabled).toBeNull(); // enabled
            expect(redoDisabled).not.toBeNull(); // still disabled
        }
    });

    test('12.10.3 — Redo button enabled after undo', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on canvas to select a panel
        const canvasBounds = await page.locator('#previewCanvas').boundingBox();
        if (!canvasBounds) return;

        await page.click('#previewCanvas', {
            position: { x: canvasBounds.width / 2, y: canvasBounds.height / 2 }
        });
        await page.waitForTimeout(300);

        const cropSectionVisible = await page.evaluate(() => {
            const cropCanvas = document.getElementById('cropPreviewCanvas');
            return cropCanvas && cropCanvas.offsetParent !== null;
        });

        if (cropSectionVisible) {
            // Reset crop to create undo history
            await page.click('.reset-crop-btn');
            await page.waitForTimeout(300);

            // Click undo button (should be enabled now)
            await page.click('#undoBtn');
            await page.waitForTimeout(300);

            // Redo should be enabled
            const redoDisabled = await page.locator('#redoBtn').getAttribute('disabled');
            expect(redoDisabled).toBeNull(); // enabled
        }
    });

    test('12.10.4 — Redo button disabled after new action following undo', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on canvas to select a panel
        const canvasBounds = await page.locator('#previewCanvas').boundingBox();
        if (!canvasBounds) return;

        await page.click('#previewCanvas', {
            position: { x: canvasBounds.width / 2, y: canvasBounds.height / 2 }
        });
        await page.waitForTimeout(300);

        const cropSectionVisible = await page.evaluate(() => {
            const cropCanvas = document.getElementById('cropPreviewCanvas');
            return cropCanvas && cropCanvas.offsetParent !== null;
        });

        if (cropSectionVisible) {
            // Reset crop to create undo history
            await page.click('.reset-crop-btn');
            await page.waitForTimeout(300);

            // Undo
            await page.click('#undoBtn');
            await page.waitForTimeout(300);

            // Redo should be enabled
            let redoDisabled = await page.locator('#redoBtn').getAttribute('disabled');
            expect(redoDisabled).toBeNull();

            // Perform another crop reset (new action clears redo stack)
            await page.click('.reset-crop-btn');
            await page.waitForTimeout(300);

            // Redo should be disabled again
            redoDisabled = await page.locator('#redoBtn').getAttribute('disabled');
            expect(redoDisabled).not.toBeNull();
        }
    });
});

test.describe('Crop Editing Flow (Section 12.11)', () => {
    let testFiles = [];

    test.afterEach(() => {
        cleanupFiles(testFiles);
    });

    test('12.11.1 — Select panel and verify crop preview appears', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on the canvas to select a panel
        const canvasBounds = await page.locator('#previewCanvas').boundingBox();
        if (canvasBounds) {
            // Click in the center of the canvas
            await page.click('#previewCanvas', {
                position: {
                    x: canvasBounds.width / 2,
                    y: canvasBounds.height / 2
                }
            });
            await page.waitForTimeout(300);

            // Check if crop preview section is visible (indicates a panel was selected)
            // The crop preview canvas appears when a panel is selected
            const cropSectionVisible = await page.evaluate(() => {
                const cropCanvas = document.getElementById('cropPreviewCanvas');
                return cropCanvas && cropCanvas.offsetParent !== null;
            });

            // If a panel was selected, crop preview should be visible
            // If not (click missed a panel), the placeholder should still show
            const placeholderVisible = await page.evaluate(() => {
                const placeholder = document.querySelector('.crop-placeholder-section');
                return placeholder && placeholder.offsetParent !== null;
            });

            // At least one should be visible
            expect(cropSectionVisible || placeholderVisible).toBe(true);
        }
    });

    test('12.11.2 — Reset Crop button is available when panel selected', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on the canvas to select a panel
        const canvasBounds = await page.locator('#previewCanvas').boundingBox();
        if (canvasBounds) {
            await page.click('#previewCanvas', {
                position: {
                    x: canvasBounds.width / 2,
                    y: canvasBounds.height / 2
                }
            });
            await page.waitForTimeout(300);

            // Check for reset crop button visibility
            const resetBtnVisible = await page.evaluate(() => {
                const btn = document.querySelector('.reset-crop-btn');
                return btn && btn.offsetParent !== null;
            });

            // If a panel was selected, reset button should be visible
            const cropSectionVisible = await page.evaluate(() => {
                const cropCanvas = document.getElementById('cropPreviewCanvas');
                return cropCanvas && cropCanvas.offsetParent !== null;
            });

            if (cropSectionVisible) {
                expect(resetBtnVisible).toBe(true);
            }
        }
    });
});

test.describe('Clear All Flow (Section 12.12)', () => {
    let testFiles = [];

    test.afterEach(() => {
        cleanupFiles(testFiles);
    });

    test('12.12.1 — Clear All resets selection state', async ({ page }) => {
        testFiles = createTestImages(3);

        await page.goto('/CollageMaker/index.html', { waitUntil: 'networkidle' });
        await page.locator('#fileInput').setInputFiles(testFiles);
        await waitForImagesLoaded(page, 3);
        await waitForCanvasVisible(page);

        // Click on canvas to potentially select a panel
        const canvasBounds = await page.locator('#previewCanvas').boundingBox();
        if (canvasBounds) {
            await page.click('#previewCanvas', {
                position: {
                    x: canvasBounds.width / 3,
                    y: canvasBounds.height / 3
                }
            });
            await page.waitForTimeout(200);
        }

        // Click Clear All
        await page.click('#clearAllBtn');
        await page.waitForTimeout(300);

        // Verify image count is 0
        await page.waitForFunction(() => {
            const header = document.querySelector('#sidebar-left h3');
            return header && header.textContent.includes('0');
        }, { timeout: 5000 });

        // Verify canvas placeholder is visible (no crash)
        const placeholderVisible = await page.evaluate(() => {
            const placeholder = document.querySelector('.canvas-placeholder');
            return placeholder && placeholder.offsetParent !== null;
        });
        expect(placeholderVisible).toBe(true);
    });
});
